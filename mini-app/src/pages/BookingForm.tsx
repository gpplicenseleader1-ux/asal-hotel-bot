import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import type { RoomType, PaymentUI, BookingSuccessData } from '../types'
import type { Translations } from '../i18n'
import { PAYMENT_DB_MAP } from '../types'
import { useBooking } from '../hooks/useBooking'
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
  standard:     60,
  junior_suite: 100,
  suite:        160,
}

interface PaymentOption {
  id:    PaymentUI
  label: string
  icon:  string
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'cash',     label: 'Наличные', icon: '💵' },
  { id: 'transfer', label: 'Перевод',  icon: '🏦' },
  { id: 'visa_mc',  label: 'Visa/MC',  icon: '💳' },
  { id: 'uzcard',   label: 'UzCard',   icon: '🔷' },
  { id: 'humo',     label: 'Humo',     icon: '🟣' },
  { id: 'payme',    label: 'Payme',    icon: '🔵' },
  { id: 'click',    label: 'Click',    icon: '🟢' },
  { id: 'mir',      label: 'Мир',      icon: '🔴' },
  { id: 'sber',     label: 'Сбер',     icon: '💚' },
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

export function BookingForm({ roomType, t, onBack, onSuccess }: Props) {
  const [checkIn,  setCheckIn]  = useState(addDays(1))
  const [checkOut, setCheckOut] = useState(addDays(2))
  const [name,     setName]     = useState('')
  const [phone,    setPhone]    = useState('')
  const [guests,   setGuests]   = useState(1)
  const [payment,  setPayment]  = useState<PaymentUI>('cash')
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  const { createBooking, loading } = useBooking()
  const { tg, user }               = useTelegram()

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

  const submitRef = useRef<() => void>(() => undefined)

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name  = t.required
    if (!phone.trim() || phone.trim().length < 7) e.phone = t.required
    if (nights < 1) e.dates = t.minOneNight
    setErrors(e)
    if (Object.keys(e).length > 0) return

    if (!user) { tg?.showAlert(t.error); return }

    tg?.MainButton.showProgress(false)
    tg?.MainButton.disable()

    const result = await createBooking({
      telegramId:    user.id,
      roomType,
      checkIn,
      checkOut,
      guestName:     name.trim(),
      guestPhone:    phone.trim(),
      guestsCount:   guests,
      paymentMethod: PAYMENT_DB_MAP[payment],
    })

    tg?.MainButton.hideProgress()
    tg?.MainButton.enable()

    if (result) {
      tg?.HapticFeedback.notificationOccurred('success')
      onSuccess({
        bookingId:  result.id,
        roomNumber: result.room_number,
        roomType:   result.room_type,
        checkIn:    result.check_in,
        checkOut:   result.check_out,
        nights:     result.nights,
        totalPrice: result.total_price,
        guestName:  result.guest_name,
      })
    } else {
      tg?.HapticFeedback.notificationOccurred('error')
      tg?.showAlert(t.error)
    }
  }

  useEffect(() => { submitRef.current = handleSubmit })

  useEffect(() => {
    if (!tg?.BackButton) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!tg?.MainButton) return
    const btn = tg.MainButton
    btn.setText(t.confirmBooking)
    btn.show()
    const cb = () => submitRef.current()
    btn.onClick(cb)
    return () => { btn.offClick(cb); btn.hide() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <p className="text-white/70 text-sm">${price}{t.perNight}</p>
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
              <span className="font-serif text-2xl font-bold text-terra">${total}</span>
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
            {PAYMENT_OPTIONS.map(({ id, label, icon }) => (
              <motion.button
                key={id}
                onClick={() => setPayment(id)}
                whileTap={{ scale: 0.93 }}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 transition-all duration-150 ${
                  payment === id
                    ? 'border-terra bg-terra-faint text-charcoal shadow-sm'
                    : 'border-sand bg-white text-charcoal-mid'
                }`}
              >
                <span className="text-xl mb-1 leading-none">{icon}</span>
                <span className="text-xs font-medium leading-tight text-center">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Fallback submit (non-Telegram browser) */}
        {!tg && (
          <motion.button
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="btn-terra w-full py-4 text-base flex items-center justify-center"
            whileTap={{ scale: 0.96 }}
            custom={4} variants={sectionVariant} initial="initial" animate="animate"
          >
            {loading ? t.loading : t.confirmBooking}
          </motion.button>
        )}
      </div>
    </div>
  )
}
