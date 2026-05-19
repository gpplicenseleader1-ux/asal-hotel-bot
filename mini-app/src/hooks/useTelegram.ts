import { useEffect, useState } from 'react'
import type { Language, TelegramUser } from '../types'

interface TelegramWebApp {
  ready: () => void
  close: () => void
  expand: () => void
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    showProgress: (leaveActive?: boolean) => void
    hideProgress: () => void
    isVisible: boolean
    color: string
    textColor: string
    setText: (text: string) => void
  }
  BackButton: {
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    isVisible: boolean
  }
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    start_param?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: {
    bg_color?: string
    text_color?: string
    button_color?: string
    button_text_color?: string
  }
  sendData: (data: string) => void
  showAlert: (message: string, callback?: () => void) => void
  showConfirm: (message: string, callback: (ok: boolean) => void) => void
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  }
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp
  const [user, setUser] = useState<TelegramUser | null>(null)
  const [lang, setLang] = useState<Language>('ru')

  useEffect(() => {
    if (!tg) return
    tg.ready()
    tg.expand()

    const u = tg.initDataUnsafe?.user
    if (u) {
      setUser(u)
      const lc = u.language_code?.toLowerCase()
      if (lc === 'uz') setLang('uz')
      else if (lc === 'en') setLang('en')
      else setLang('ru')
    }
  }, [tg])

  return {
    tg,
    user,
    lang,
    setLang,
    isDark: tg?.colorScheme === 'dark',
  }
}
