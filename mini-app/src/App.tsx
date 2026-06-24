import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
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

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const pageVariants = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
  exit:     { opacity: 0, y: -10, transition: { duration: 0.18, ease: 'easeIn' as const } },
}

export default function App() {
  const { lang: tgLang } = useTelegram()
  const [lang, setLang]   = useState<Language>(tgLang)
  const [page, setPage]   = useState<Page>({ name: 'home' })
  const t = useTranslations(lang)

  const renderPage = () => {
    if (page.name === 'home') {
      return (
        <motion.div key="home" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <Home
            lang={lang}
            setLang={setLang}
            t={t}
            onBook={(roomType) => setPage({ name: 'booking', roomType })}
            onMyBookings={() => setPage({ name: 'my-bookings' })}
          />
        </motion.div>
      )
    }
    if (page.name === 'booking') {
      return (
        <motion.div key="booking" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <BookingForm
            roomType={page.roomType}
            t={t}
            onBack={() => setPage({ name: 'home' })}
            onSuccess={(data) => setPage({ name: 'success', data })}
          />
        </motion.div>
      )
    }
    if (page.name === 'my-bookings') {
      return (
        <motion.div key="my-bookings" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <MyBookings
            t={t}
            onBack={() => setPage({ name: 'home' })}
          />
        </motion.div>
      )
    }
    return (
      <motion.div key="success" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Success
          data={page.data}
          t={t}
          onHome={() => setPage({ name: 'home' })}
        />
      </motion.div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {renderPage()}
    </AnimatePresence>
  )
}
