import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Booking, Language } from '../types'
import type { Translations } from '../i18n'
import { useBooking } from '../hooks/useBooking'
import { useTelegram } from '../hooks/useTelegram'

interface Props {
  lang: Language
  t: Translations
}

const STATUS_EMOJI: Record<string, string> = {
  pending: '⏳',
  confirmed: '✅',
  cancelled: '❌',
  completed: '🏁',
}

export function MyBookings({ lang: _lang, t }: Props) {
  const navigate = useNavigate()
  const { user } = useTelegram()
  const { getUserBookings, getOrCreateUser, loading } = useBooking()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!user) return
    getOrCreateUser(user.id, `${user.first_name} ${user.last_name ?? ''}`.trim(), user.username)
      .then((u) => getUserBookings(u.id))
      .then(setBookings)
  }, [user, getUserBookings, getOrCreateUser])

  const statusLabel: Record<string, string> = {
    pending: t.pending,
    confirmed: t.confirmed,
    cancelled: t.cancelled,
    completed: t.completed,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 text-xl">←</button>
        <h1 className="font-semibold text-gray-900">📋 {t.myBookings}</h1>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">{t.loading}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500">{t.noBookings}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2 bg-brand-500 text-white rounded-xl font-medium"
            >
              {t.bookNow}
            </button>
          </div>
        ) : (
          bookings.map((b) => {
            const nights = Math.round(
              (new Date(b.check_out_date).getTime() - new Date(b.check_in_date).getTime()) / 86400000,
            )
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-mono text-gray-400 uppercase">#{b.id.slice(0, 8)}</span>
                    <div className="font-semibold text-gray-900">
                      {b.room_type === 'standard' ? t.standard : b.room_type === 'deluxe' ? t.deluxe : t.suite}
                      {b.rooms?.room_number && <span className="text-gray-500 font-normal ml-1">№{b.rooms.room_number}</span>}
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                    b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    b.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    b.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {STATUS_EMOJI[b.status]} {statusLabel[b.status]}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>📅 {b.check_in_date} → {b.check_out_date} ({nights} {t.nights})</div>
                  <div>👥 {b.guests_count} {t.guests} · 💳 {b.payment_method}</div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                  <span className="text-gray-500 text-sm">👤 {b.guest_name}</span>
                  <span className="font-bold text-brand-600">${b.total_price}</span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
