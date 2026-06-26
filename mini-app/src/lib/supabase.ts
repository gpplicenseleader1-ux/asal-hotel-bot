import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] env vars missing — URL present:', !!supabaseUrl, '| KEY present:', !!supabaseAnonKey)
} else {
  console.error('[supabase] client initialised — URL:', supabaseUrl.slice(0, 40))
}

// Telegram iOS WebView (WKWebView) sometimes hangs fetch() requests indefinitely,
// eventually surfacing as "TypeError: Load failed" with no timeout. Wrapping fetch
// with a 15-second AbortSignal makes failures explicit and fast.
const fetchWithTimeout: typeof fetch = (input, init?) => {
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(new Error('Supabase request timed out (15 s)')), 15_000)
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timerId))
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout },
})
