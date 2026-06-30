import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Banknote, ArrowLeftRight, CreditCard, Smartphone, Landmark,
} from 'lucide-react'
import type { RoomType, PaymentUI, BookingSuccessData } from '../types'
import type { Translations } from '../i18n'
import { PAYMENT_DB_MAP } from '../types'
import { useTelegram } from '../hooks/useTelegram'

interface Props {
  roomType:  RoomType
  t:         Translations
  onBack:    () => void
  onSuccess: (data: BookingSuccessData) => void
}

const MAX_GUESTS: Record<RoomType, number> = {
  standard:     2,
  junior_suite: 3,
  suite:        4,
}

const ROOM_PRICE: Record<RoomType, number> = {
  standard:     400000,
  junior_suite: 600000,
  suite:        800000,
}

type PaymentIcon = typeof Banknote

interface PaymentOption {
  id:   PaymentUI
  key:  keyof Translations
  Icon: PaymentIcon
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'cash',     key: 'cash',     Icon: Banknote       },
  { id: 'transfer', key: 'transfer', Icon: ArrowLeftRight  },
  { id: 'visa_mc',  key: 'visa_mc',  Icon: CreditCard      },
  { id: 'uzcard',   key: 'uzcard',   Icon: CreditCard      },
  { id: 'humo',     key: 'humo',     Icon: CreditCard      },
  { id: 'payme',    key: 'payme',    Icon: Smartphone      },
  { id: 'click',    key: 'click',    Icon: Smartphone      },
  { id: 'mir',      key: 'mir',      Icon: CreditCard      },
  { id: 'sber',     key: 'sber',     Icon: Landmark        },
]

const todayStr = () => new Date().toISOString().split('T')[0]
const addDays   = (n: number) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0]

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const sectionVariant = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: EASE_OUT },
  }),
}

export function BookingForm({ roomType, t, onBack }: Props) {
  const [checkIn,  setCheckIn]  = useState(addDays(1))
  const [checkOut, setCheckOut] = useState(addDays(2))
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [guests,   setGuests]   = useState(1)
  const [payment,  setPayment]  = useState<PaymentUI>('cash')
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const [sending, setSending] = useState(false)
  const { tg, user }         = useTelegram()

  const price  = ROOM_PRICE[roomType]
  const maxG   = MAX_GUESTS[roomType]
  const nights = Math.max(
    0,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  )
  const total = price * nights

  const roomLabel: Record<RoomType, string> = {
    standard:     t.standard,
    junior_suite: t.juniorSuite,
    suite:        t.suite,
  }

  const handleSubmit = () => {
    if (sending) return

    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name  = t.required
    if (!phone.trim() || phone.trim().length < 7) e.phone = t.required
    if (nights < 1) e.dates = t.minOneNight
    setErrors(e)
    if (Object.keys(e).length > 0) return

    if (!user) { tg?.showAlert(t.error); return }

    setSending(true)

    // sendData() closes the app immediately when opened via KeyboardButton.
    // If the app is still open after 3 s the context doesn't support sendData
    // (e.g. inline keyboard or browser) — reset loading and show an error.
    const fallbackTimer = setTimeout(() => {
      setSending(false)
      tg?.showAlert(t.error)
    }, 3000)

    try {
      tg?.sendData(JSON.stringify({
        room_type:      roomType,
        check_in:       checkIn,
        check_out:      checkOut,
        guest_name:     name.trim(),
        guest_phone:    phone.trim(),
        guests_count:   guests,
        payment_method: PAYMENT_DB_MAP[payment],
      }))
      // sendData() closes the mini-app synchronously — fallbackTimer is a safety net
    } catch (err) {
      clearTimeout(fallbackTimer)
      setSending(false)
      tg?.HapticFeedback?.notificationOccurred('error')
      tg?.showAlert((err as Error).message || t.error)
    }
  }

  useEffect(() => {
    if (!tg?.BackButton) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  // Hide the native Telegram MainButton — we use the in-page button exclusively.
  // Showing both caused a double-submit race condition against Supabase.
  useEffect(() => {
    if (!tg?.MainButton) return
    tg.MainButton.hide()
    return () => { tg.MainButton.hide() }
  }, [tg])

  return (
    <div className="min-h-screen bg-offwhite pb-32">
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
        <div>
          <p className="font-serif text-white text-xl font-semibold leading-tight">{roomLabel[roomType]}</p>
          <p className="text-white/70 text-sm">{price.toLocaleString('ru-RU')} сум{t.perNight}</p>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* ── Dates ── */}
        <motion.div
          className="card-premium p-4"
          custom={0} variants={sectionVariant} initial="initial" animate="animate"
        >
          <h3 className="label-caps text-terra mb-3">{t.selectDates}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-charcoal-mid mb-1.5 block">{t.checkIn}</label>
              <input
                type="date"
                value={checkIn}
                min={todayStr()}
                onChange={(e) => {
                  setCheckIn(e.target.value)
                  if (e.target.value >= checkOut) setCheckOut(addDays(1))
                }}
                className={`input-hotel text-sm ${errors.dates ? 'border-red-400' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs text-charcoal-mid mb-1.5 block">{t.checkOut}</label>
              <input
                type="date"
                value={checkOut}
                min={addDays(1)}
                onChange={(e) => setCheckOut(e.target.value)}
                className={`input-hotel text-sm ${errors.dates ? 'border-red-400' : ''}`}
              />
            </div>
          </div>
          {errors.dates && <p className="text-red-500 text-xs mt-1.5">{errors.dates}</p>}
          {nights > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3 bg-terra-faint rounded-2xl px-4 py-3 flex items-center justify-between"
            >
              <span className="text-charcoal-mid text-sm">
                {nights} {nights === 1 ? t.night : t.nights}
              </span>
              <span className="font-serif text-2xl font-bold text-terra">{total.toLocaleString('ru-RU')} сум</span>
            </motion.div>
          )}
        </motion.div>

        {/* ── Guest info ── */}
        <motion.div
          className="card-premium p-4 space-y-4"
          custom={1} variants={sectionVariant} initial="initial" animate="animate"
        >
          <h3 className="label-caps text-terra">{t.guestName}</h3>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.enterName}
              className={`input-hotel ${errors.name ? 'border-red-400' : ''}`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs text-charcoal-mid mb-1.5 block">{t.guestPhone}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t.enterPhone}
              className={`input-hotel ${errors.phone ? 'border-red-400' : ''}`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>
        </motion.div>

        {/* ── Guests count ── */}
        <motion.div
          className="card-premium p-4"
          custom={2} variants={sectionVariant} initial="initial" animate="animate"
        >
          <h3 className="label-caps text-terra mb-3">{t.guests}</h3>
          <div className="flex gap-2">
            {Array.from({ length: maxG }, (_, i) => i + 1).map((n) => (
              <motion.button
                key={n}
                onClick={() => setGuests(n)}
                whileTap={{ scale: 0.92 }}
                className={`flex-1 py-3 rounded-2xl border-2 font-bold text-lg transition-all duration-150 ${
                  guests === n
                    ? 'border-terra bg-terra text-white shadow-terra'
                    : 'border-sand bg-white text-charcoal'
                }`}
              >
                {n}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Payment ── */}
        <motion.div
          className="card-premium p-4"
          custom={3} variants={sectionVariant} initial="initial" animate="animate"
        >
          <h3 className="label-caps text-terra mb-3">{t.paymentMethod}</h3>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_OPTIONS.map(({ id, key, Icon }) => (
              <motion.button
                key={id}
                onClick={() => setPayment(id)}
                whileTap={{ scale: 0.93 }}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all duration-150 ${
                  payment === id
                    ? 'border-terra bg-terra-faint text-terra-deep shadow-sm'
                    : 'border-sand bg-white text-charcoal-mid'
                }`}
              >
                <Icon size={18} className="mb-1" />
                <span className="text-xs font-medium leading-tight text-center">{String(t[key])}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Submit button — always visible */}
        <motion.button
          onClick={handleSubmit}
          disabled={sending}
          className="btn-terra w-full py-4 text-base flex items-center justify-center"
          whileTap={{ scale: 0.96 }}
          custom={4} variants={sectionVariant} initial="initial" animate="animate"
        >
          {sending ? t.loading : t.confirmBooking}
        </motion.button>
      </div>
    </div>
  )
}
