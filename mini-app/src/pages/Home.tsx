import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Room, RoomType, Language } from '../types'
import type { Translations } from '../i18n'
import { DateRangePicker } from '../components/DatePicker'
import { RoomGrid } from '../components/RoomGrid'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useBooking } from '../hooks/useBooking'

interface Props {
  lang: Language
  setLang: (l: Language) => void
  t: Translations
}

export function Home({ lang, setLang, t }: Props) {
  const navigate = useNavigate()
  const { getAvailableRooms, loading } = useBooking()

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [checkIn, setCheckIn] = useState(today)
  const [checkOut, setCheckOut] = useState(tomorrow)
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeType, setActiveType] = useState<RoomType | 'all'>('all')

  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0

  useEffect(() => {
    if (checkIn && checkOut && checkIn < checkOut) {
      getAvailableRooms(checkIn, checkOut).then(setRooms)
    }
  }, [checkIn, checkOut, getAvailableRooms])

  const handleSelectRoom = (room: Room) => {
    navigate('/booking', { state: { room, checkIn, checkOut, nights } })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900 text-lg">🌹 {t.appName}</h1>
            <p className="text-xs text-gray-500">{t.tagline}</p>
          </div>
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </div>
      </div>

      <div className="p-4 space-y-4">
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={(d) => {
            setCheckIn(d)
            if (d >= checkOut) {
              const next = new Date(new Date(d).getTime() + 86400000).toISOString().split('T')[0]
              setCheckOut(next)
            }
          }}
          onCheckOutChange={setCheckOut}
          t={t}
        />

        <div>
          <h2 className="font-semibold text-gray-900 mb-3">
            {t.availableRooms}
            {nights > 0 && <span className="text-sm font-normal text-gray-500 ml-2">({nights} {nights === 1 ? t.night : t.nights})</span>}
          </h2>
          <RoomGrid
            rooms={rooms}
            lang={lang}
            t={t}
            nights={nights}
            activeType={activeType}
            onTypeChange={setActiveType}
            onSelect={handleSelectRoom}
            loading={loading}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-3">
        <button
          onClick={() => navigate('/my-bookings')}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium"
        >
          📋 {t.myBookings}
        </button>
        <button
          onClick={() => navigate('/loyalty')}
          className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium"
        >
          💎 {t.loyaltyProgram}
        </button>
      </div>
    </div>
  )
}
