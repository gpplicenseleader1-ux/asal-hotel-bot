import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { UserBooking, BookingStatus } from '../types'
import type { Translations } from '../i18n'
import { useBooking } from '../hooks/useBooking'
import { useTelegram } from '../hooks/useTelegram'

interface Props {
  t:      Translations
  onBack: () => void
}

interface StatusStyle {
  icon:  string
  color: string
  bg:    string
}

const STATUS_STYLE: Record<BookingStatus, StatusStyle> = {
  pending:   { icon: '⏳', color: 'text-amber-700',    bg: 'bg-amber-50'   },
  confirmed: { icon: '✅', color: 'text-green-700',    bg: 'bg-green-50'   },
  cancelled: { icon: '❌', color: 'text-red-600',      bg: 'bg-red-50'     },
  completed: { icon: '🏁', color: 'text-charcoal-mid', bg: 'bg-sand-light' },
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${String(y).slice(2)}`
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const listVariant = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}
const itemVariant = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
}

export function MyBookings({ t, onBack }: Props) {
  const { tg, user }                = useTelegram()
  const { getUserBookings, loading } = useBooking()
  const [bookings, setBookings]     = useState<UserBooking[]>([])

  useEffect(() => {
    if (!tg?.BackButton) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!user) return
    getUserBookings(user.id).then(setBookings)
  }, [user, getUserBookings])

  const roomLabel: Record<string, string> = {
    standard:     t.standard,
    junior_suite: t.juniorSuite,
    suite:        t.suite,
  }
  const statusLabel: Record<BookingStatus, string> = {
    pending:   t.pending,
    confirmed: t.confirmed,
    cancelled: t.cancelled,
    completed: t.completed,
  }

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Header */}
      <div
        className="px-5 py-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #8A4B33 0%, #C56B4A 100%)' }}
      >
        <motion.button
          onClick={onBack}
          className="text-white/80 text-2xl font-light leading-none"
          whileTap={{ scale: 0.9 }}
        >
          ←
        </motion.button>
        <p className="font-serif text-white text-xl font-semibold">📋 {t.myBookings}</p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex-1 h-px bg-sand" />
        <span className="text-terra font-serif text-sm">✦</span>
        <div className="flex-1 h-px bg-sand" />
      </div>

      <div className="px-4 pb-8 space-y-3">
        {loading && (
          <div className="text-center py-16">
            <motion.p
              className="text-terra text-3xl font-serif"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
            >
              ✦
            </motion.p>
            <p className="text-charcoal-mid mt-3 text-sm">{t.loading}</p>
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <p className="text-5xl mb-4">🏨</p>
            <p className="font-serif text-charcoal text-xl mb-1">Asal Hotel</p>
            <p className="text-charcoal-mid text-sm mb-6">{t.noBookings}</p>
            <motion.button
              onClick={onBack}
              className="btn-terra px-8"
              whileTap={{ scale: 0.96 }}
            >
              {t.bookNow}
            </motion.button>
          </motion.div>
        )}

        {!loading && bookings.length > 0 && (
          <motion.div
            className="space-y-3"
            variants={listVariant}
            initial="initial"
            animate="animate"
          >
            {bookings.map((b) => {
              const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
              return (
                <motion.div key={b.id} variants={itemVariant} className="card-premium">
                  {/* Status bar */}
                  <div className={`${style.bg} px-4 py-2 flex items-center justify-between border-b border-sand`}>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${style.color}`}>
                      {style.icon} {statusLabel[b.status]}
                    </span>
                    <span className="text-xs font-mono text-charcoal-light">
                      #{b.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-serif text-charcoal font-semibold">
                          {roomLabel[b.room_type] ?? b.room_type}
                          <span className="font-sans font-normal text-charcoal-mid text-sm ml-1.5">
                            №{b.room_number}
                          </span>
                        </p>
                        <p className="text-xs text-charcoal-mid mt-0.5">
                          {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.nights} {t.nights}
                        </p>
                      </div>
                      <span className="font-serif text-xl font-bold text-terra">${b.total_price}</span>
                    </div>

                    <div className="text-xs text-charcoal-light border-t border-sand pt-2 flex items-center gap-2">
                      <span>👤 {b.guest_name}</span>
                      <span>·</span>
                      <span>💳 {b.payment_method}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </div>
  )
}
