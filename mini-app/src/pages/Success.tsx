import { useEffect } from 'react'
import type { BookingSuccessData, RoomType } from '../types'
import type { Translations } from '../i18n'
import { useTelegram } from '../hooks/useTelegram'

interface Props {
  data:   BookingSuccessData
  t:      Translations
  onHome: () => void
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export function Success({ data, t, onHome }: Props) {
  const { tg } = useTelegram()

  const roomLabel: Record<RoomType, string> = {
    standard:     t.standard,
    junior_suite: t.juniorSuite,
    suite:        t.suite,
  }

  useEffect(() => {
    tg?.MainButton.hide()
    tg?.BackButton.hide()
  }, [tg])

  return (
    <div className="min-h-screen bg-beige flex flex-col items-center justify-center px-5 text-center">
      {/* Gold check circle */}
      <div className="w-24 h-24 rounded-full bg-gold flex items-center justify-center shadow-gold mb-6">
        <span className="text-white text-4xl font-bold leading-none">✓</span>
      </div>

      <h1 className="font-serif text-3xl font-bold text-brown mb-2">{t.bookingConfirmed}</h1>
      <p className="text-brown-mid text-sm mb-8">{t.bookingConfirmedSub}</p>

      {/* Booking details card */}
      <div className="w-full max-w-sm card-hotel mb-8">
        {/* Header — dark */}
        <div className="bg-brown px-5 py-3 flex items-center justify-between">
          <span className="text-gold-light text-xs uppercase tracking-widest">{t.bookingNumber}</span>
          <span className="font-mono text-white font-bold text-sm">
            #{data.bookingId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="bg-white px-5 py-4 space-y-3">
          <DetailRow label="Номер" value={`${roomLabel[data.roomType]} №${data.roomNumber}`} bold />
          <div className="h-px bg-beige-dark" />
          <DetailRow label={t.checkIn}  value={fmtDate(data.checkIn)} />
          <DetailRow label={t.checkOut} value={fmtDate(data.checkOut)} />
          <div className="h-px bg-beige-dark" />
          <div className="flex justify-between items-center">
            <span className="text-brown-mid text-sm">
              {data.nights} {data.nights === 1 ? t.night : t.nights}
            </span>
            <span className="font-serif text-2xl font-bold text-gold">${data.totalPrice}</span>
          </div>
          <div className="h-px bg-beige-dark" />
          <DetailRow label="Гость" value={data.guestName} />
        </div>

        {/* Gold footer */}
        <div className="bg-gold-faint px-5 py-3 text-center border-t border-gold-pale">
          <span className="text-gold text-xs tracking-[0.3em]">✦ ASAL BOUTIQUE HOTEL ✦</span>
        </div>
      </div>

      <button onClick={onHome} className="btn-gold px-10 py-4 text-base gap-2">
        ← {t.backToHome}
      </button>
    </div>
  )
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-brown-mid text-sm">{label}</span>
      <span className={`text-sm ${bold ? 'font-serif font-semibold text-brown' : 'text-brown font-medium'}`}>
        {value}
      </span>
    </div>
  )
}
