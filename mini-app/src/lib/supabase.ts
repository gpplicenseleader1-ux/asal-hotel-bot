import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] env vars missing — URL present:', !!supabaseUrl, '| KEY present:', !!supabaseAnonKey)
} else {
  console.error('[supabase] client initialised — URL:', supabaseUrl.slice(0, 40))
}

// WKWebView (Telegram iOS) workaround:
// 1. mode:'cors' + credentials:'omit' — avoids WebKit's stricter handling of
//    credentialed cross-origin requests that can silently trigger "Load failed".
// 2. Retry once on TypeError — WKWebView sometimes rejects the very first
//    cross-origin fetch before its network stack is fully warmed up; a 300 ms
//    retry usually succeeds without any real server-side change needed.
// 3. AbortSignal timeout — prevents indefinite hangs that also surface as
//    "TypeError: Load failed" in WKWebView.
const fetchWithRetry: typeof fetch = async (input, init?) => {
  const controller = new AbortController()
  const timerId = setTimeout(
    () => controller.abort(new Error('Supabase request timed out (15 s)')),
    15_000,
  )

  const attempt = () =>
    fetch(input, {
      ...init,
      signal:      controller.signal,
      mode:        'cors',
      credentials: 'omit',
    })

  try {
    return await attempt()
  } catch (err) {
    if (err instanceof TypeError) {
      // First cross-origin fetch failed in WKWebView — retry after brief delay.
      console.error('[supabase] fetch TypeError, retrying in 300 ms:', (err as TypeError).message)
      await new Promise<void>((res) => setTimeout(res, 300))
      return attempt()
    }
    throw err
  } finally {
    clearTimeout(timerId)
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithRetry },
})
