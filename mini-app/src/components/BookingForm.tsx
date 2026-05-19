import { useState } from 'react'
import type { Room, PaymentMethod, Language } from '../types'
import type { Translations } from '../i18n'

interface Props {
  room: Room
  checkIn: string
  checkOut: string
  nights: number
  lang: Language
  t: Translations
  onSubmit: (data: {
    guest_name: string
    guest_phone: string
    guests_count: number
    payment_method: PaymentMethod
  }) => void
  onBack: () => void
  loading: boolean
}

const PAYMENT_OPTIONS: PaymentMethod[] = ['cash', 'transfer', 'card']

export function BookingForm({ room, checkIn, checkOut, nights, lang, t, onSubmit, onBack, loading }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(1)
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const paymentLabel: Record<PaymentMethod, string> = {
    cash: t.cash,
    transfer: t.transfer,
    card: t.card,
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = t.required
    if (!phone.trim() || phone.trim().length < 7) e.phone = t.required
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({ guest_name: name.trim(), guest_phone: phone.trim(), guests_count: guests, payment_method: payment })
  }

  const descKey = `description_${lang}` as keyof Room
  const description = (room[descKey] as string) || room.description_ru
  const total = room.price_per_night * nights

  return (
    <div className="space-y-4">
      <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
        <div className="font-semibold text-gray-900 mb-1">
          {room.type === 'standard' ? t.standard : room.type === 'deluxe' ? t.deluxe : t.suite} №{room.room_number}
        </div>
        <div className="text-sm text-gray-600 mb-2">{description}</div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">📅 {checkIn} → {checkOut}</span>
          <span className="font-bold text-brand-600">${total}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">{t.guestName} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.enterName}
            className={`w-full rounded-xl border-2 px-4 py-3 text-base focus:outline-none ${errors.name ? 'border-red-400' : 'border-gray-200 focus:border-brand-500'}`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">{t.guestPhone} *</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            className={`w-full rounded-xl border-2 px-4 py-3 text-base focus:outline-none ${errors.phone ? 'border-red-400' : 'border-gray-200 focus:border-brand-500'}`}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">{t.guests}</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setGuests(n)}
                className={`flex-1 py-2 rounded-xl border-2 font-medium transition-colors ${
                  guests === n
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-200 text-gray-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">{t.paymentMethod}</label>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => setPayment(m)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                  payment === m ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
                }`}
              >
                {paymentLabel[m]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium"
        >
          {t.back}
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-2 flex-grow py-3 rounded-xl bg-brand-500 text-white font-semibold disabled:opacity-50"
        >
          {loading ? t.loading : t.confirmBooking}
        </button>
      </div>
    </div>
  )
}
