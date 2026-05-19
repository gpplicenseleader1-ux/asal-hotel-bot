import { useLocation, useNavigate } from 'react-router-dom'
import type { Room, Language } from '../types'
import type { Translations } from '../i18n'
import { BookingForm } from '../components/BookingForm'
import { useBooking } from '../hooks/useBooking'
import { useTelegram } from '../hooks/useTelegram'

interface LocationState {
  room: Room
  checkIn: string
  checkOut: string
  nights: number
}

interface Props {
  lang: Language
  t: Translations
}

export function BookingPage({ lang, t }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null
  const { tg, user } = useTelegram()
  const { createBooking, getOrCreateUser, loading } = useBooking()

  if (!state?.room) {
    navigate('/')
    return null
  }

  const { room, checkIn, checkOut, nights } = state

  const handleSubmit = async (formData: Parameters<React.ComponentProps<typeof BookingForm>['onSubmit']>[0]) => {
    try {
      let userId: string
      if (user) {
        const dbUser = await getOrCreateUser(user.id, `${user.first_name} ${user.last_name ?? ''}`.trim(), user.username)
        userId = dbUser.id
      } else {
        throw new Error('User not found')
      }

      const booking = await createBooking({
        user_id: userId,
        room_id: room.id,
        room_type: room.type,
        check_in_date: checkIn,
        check_out_date: checkOut,
        ...formData,
      })

      if (booking) {
        tg?.HapticFeedback.notificationOccurred('success')
        tg?.showAlert(`✅ ${t.bookingSuccess}\n${t.bookingId}: ${booking.id.slice(0, 8).toUpperCase()}`, () => {
          navigate('/my-bookings')
        })
      } else {
        tg?.HapticFeedback.notificationOccurred('error')
        tg?.showAlert(t.error)
      }
    } catch {
      tg?.showAlert(t.error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-500 text-xl">←</button>
        <h1 className="font-semibold text-gray-900">{t.bookNow}</h1>
      </div>

      <div className="p-4 pb-8">
        <BookingForm
          room={room}
          checkIn={checkIn}
          checkOut={checkOut}
          nights={nights}
          lang={lang}
          t={t}
          onSubmit={handleSubmit}
          onBack={() => navigate(-1)}
          loading={loading}
        />
      </div>
    </div>
  )
}
