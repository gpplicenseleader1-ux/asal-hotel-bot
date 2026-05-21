import { useState } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { useTranslations } from './i18n'
import { Home } from './pages/Home'
import { BookingForm } from './pages/BookingForm'
import { MyBookings } from './pages/MyBookings'
import { Success } from './pages/Success'
import type { Language, RoomType, BookingSuccessData } from './types'

type Page =
  | { name: 'home' }
  | { name: 'booking'; roomType: RoomType }
  | { name: 'my-bookings' }
  | { name: 'success'; data: BookingSuccessData }

export default function App() {
  const { lang: tgLang } = useTelegram()
  const [lang, setLang]   = useState<Language>(tgLang)
  const [page, setPage]   = useState<Page>({ name: 'home' })
  const t = useTranslations(lang)

  if (page.name === 'home') {
    return (
      <Home
        lang={lang}
        setLang={setLang}
        t={t}
        onBook={(roomType) => setPage({ name: 'booking', roomType })}
        onMyBookings={() => setPage({ name: 'my-bookings' })}
      />
    )
  }

  if (page.name === 'booking') {
    return (
      <BookingForm
        roomType={page.roomType}
        t={t}
        onBack={() => setPage({ name: 'home' })}
        onSuccess={(data) => setPage({ name: 'success', data })}
      />
    )
  }

  if (page.name === 'my-bookings') {
    return (
      <MyBookings
        t={t}
        onBack={() => setPage({ name: 'home' })}
      />
    )
  }

  return (
    <Success
      data={page.data}
      t={t}
      onHome={() => setPage({ name: 'home' })}
    />
  )
}
