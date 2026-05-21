import { useEffect, useState } from 'react'
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
  pending:   { icon: '⏳', color: 'text-amber-700',   bg: 'bg-amber-50'    },
  confirmed: { icon: '✅', color: 'text-green-700',   bg: 'bg-green-50'    },
  cancelled: { icon: '❌', color: 'text-red-600',     bg: 'bg-red-50'      },
  completed: { icon: '🏁', color: 'text-brown-mid',   bg: 'bg-beige-dark'  },
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${String(y).slice(2)}`
}

export function MyBookings({ t, onBack }: Props) {
  const { tg, user }               = useTelegram()
  const { getUserBookings, loading } = useBooking()
  const [bookings, setBookings]    = useState<UserBooking[]>([])

  // Telegram BackButton
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
    <div className="min-h-screen bg-beige">
      {/* Header */}
      <div className="bg-brown px-5 py-4 flex items-center gap-4">
        <button onClick={onBack} className="text-gold-pale text-2xl font-light leading-none">←</button>
        <p className="font-serif text-white text-lg font-semibold">📋 {t.myBookings}</p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div className="flex-1 h-px bg-beige-dark" />
        <span className="text-gold text-sm">✦</span>
        <div className="flex-1 h-px bg-beige-dark" />
      </div>

      <div className="px-4 pb-8 space-y-3">
        {loading && (
          <div className="text-center py-16">
            <p className="text-gold text-3xl animate-pulse">✦</p>
            <p className="text-brown-mid mt-3 text-sm">{t.loading}</p>
          </div>
        )}

        {!loading && bookings.length === 0 && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🏨</p>
            <p className="font-serif text-brown text-xl mb-1">Asal Hotel</p>
            <p className="text-brown-mid text-sm mb-6">{t.noBookings}</p>
            <button onClick={onBack} className="btn-gold px-8">
              {t.bookNow}
            </button>
          </div>
        )}

        {!loading && bookings.map((b) => {
          const style = STATUS_STYLE[b.status] ?? STATUS_STYLE.pending
          return (
            <div key={b.id} className="card-hotel">
              {/* Status bar */}
              <div className={`${style.bg} px-4 py-2 flex items-center justify-between border-b border-beige-dark`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${style.color}`}>
                  {style.icon} {statusLabel[b.status]}
                </span>
                <span className="text-xs font-mono text-brown-light">
                  #{b.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              {/* Body */}
              <div className="px-4 py-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-serif text-brown font-semibold">
                      {roomLabel[b.room_type] ?? b.room_type}
                      <span className="font-sans font-normal text-brown-mid text-sm ml-1.5">
                        №{b.room_number}
                      </span>
                    </p>
                    <p className="text-xs text-brown-mid mt-0.5">
                      {fmtDate(b.check_in)} → {fmtDate(b.check_out)} · {b.nights} {t.nights}
                    </p>
                  </div>
                  <span className="font-serif text-xl font-bold text-gold">${b.total_price}</span>
                </div>

                <div className="text-xs text-brown-light border-t border-beige pt-2 flex items-center gap-2">
                  <span>👤 {b.guest_name}</span>
                  <span>·</span>
                  <span>💳 {b.payment_method}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
