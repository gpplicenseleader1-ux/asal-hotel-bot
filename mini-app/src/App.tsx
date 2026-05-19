import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { useTranslations } from './i18n'
import { Home } from './pages/Home'
import { BookingPage } from './pages/BookingPage'
import { MyBookings } from './pages/MyBookings'
import { LoyaltyPage } from './pages/LoyaltyPage'
import type { Language } from './types'

export default function App() {
  const { lang: tgLang } = useTelegram()
  const [lang, setLang] = useState<Language>(tgLang)
  const t = useTranslations(lang)

  return (
    <Routes>
      <Route path="/" element={<Home lang={lang} setLang={setLang} t={t} />} />
      <Route path="/booking" element={<BookingPage lang={lang} t={t} />} />
      <Route path="/my-bookings" element={<MyBookings lang={lang} t={t} />} />
      <Route path="/loyalty" element={<LoyaltyPage lang={lang} t={t} />} />
    </Routes>
  )
}
