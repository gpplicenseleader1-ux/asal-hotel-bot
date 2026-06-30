import { useEffect } from 'react'
import { motion } from 'framer-motion'
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
    <div className="min-h-screen bg-offwhite flex flex-col items-center justify-center px-5 text-center py-10">

      {/* Animated checkmark */}
      <motion.div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-terra"
        style={{ background: 'linear-gradient(135deg, #C56B4A 0%, #8A4B33 100%)' }}
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <motion.path
            d="M8 20 L17 29 L32 12"
            stroke="white"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.4, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
      >
        <h1 className="font-serif text-3xl font-semibold text-charcoal mb-2">{t.bookingConfirmed}</h1>
        <p className="text-charcoal-mid text-sm mb-8">{t.bookingConfirmedSub}</p>
      </motion.div>

      {/* Booking details card */}
      <motion.div
        className="w-full max-w-sm card-premium mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
      >
        <div
          className="px-5 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #8A4B33 0%, #C56B4A 100%)' }}
        >
          <span className="label-caps text-white/70">{t.bookingNumber}</span>
          <span className="font-mono text-white font-bold text-sm">
            #{data.bookingId.slice(0, 8).toUpperCase()}
          </span>
        </div>

        <div className="bg-white px-5 py-4 space-y-3">
          <DetailRow label="Номер" value={`${roomLabel[data.roomType]} №${data.roomNumber}`} bold />
          <div className="h-px bg-sand" />
          <DetailRow label={t.checkIn}  value={fmtDate(data.checkIn)} />
          <DetailRow label={t.checkOut} value={fmtDate(data.checkOut)} />
          <div className="h-px bg-sand" />
          <div className="flex justify-between items-center">
            <span className="text-charcoal-mid text-sm">
              {data.nights} {data.nights === 1 ? t.night : t.nights}
            </span>
            <span className="font-serif text-2xl font-bold text-terra">{data.totalPrice.toLocaleString('ru-RU')} сум</span>
          </div>
          <div className="h-px bg-sand" />
          <DetailRow label="Гость" value={data.guestName} />
        </div>

        <div className="bg-terra-faint px-5 py-3 text-center border-t border-terra/15">
          <span className="label-caps text-terra tracking-[0.3em]">✦ ASAL BOUTIQUE HOTEL ✦</span>
        </div>
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-3 w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <motion.button
          onClick={onHome}
          className="btn-terra w-full py-4 text-base flex items-center justify-center gap-2"
          whileTap={{ scale: 0.96 }}
        >
          ← {t.backToHome}
        </motion.button>
      </motion.div>
    </div>
  )
}

function DetailRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-charcoal-mid text-sm">{label}</span>
      <span className={`text-sm ${bold ? 'font-serif font-semibold text-charcoal' : 'text-charcoal font-medium'}`}>
        {value}
      </span>
    </div>
  )
}
