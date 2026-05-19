import { useState } from 'react'
import type { Translations } from '../i18n'

interface Props {
  label: string
  value: string
  onChange: (date: string) => void
  min?: string
  t: Translations
}

export function DatePicker({ label, value, onChange, min, t: _t }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const minDate = min ?? today

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="date"
        value={value}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-900 focus:border-brand-500 focus:outline-none text-base"
      />
    </div>
  )
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  t,
}: {
  checkIn: string
  checkOut: string
  onCheckInChange: (d: string) => void
  onCheckOutChange: (d: string) => void
  t: Translations
}) {
  const today = new Date().toISOString().split('T')[0]
  const minCheckout = checkIn
    ? new Date(new Date(checkIn).getTime() + 86400000).toISOString().split('T')[0]
    : today

  const nights =
    checkIn && checkOut
      ? Math.round(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
        )
      : 0

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-3">
      <DatePicker label={t.checkIn} value={checkIn} onChange={onCheckInChange} min={today} t={t} />
      <DatePicker
        label={t.checkOut}
        value={checkOut}
        onChange={onCheckOutChange}
        min={minCheckout}
        t={t}
      />
      {nights > 0 && (
        <div className="text-center text-sm font-medium text-brand-600">
          {nights} {nights === 1 ? t.night : t.nights}
        </div>
      )}
    </div>
  )
}
