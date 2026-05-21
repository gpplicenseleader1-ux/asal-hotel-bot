import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RoomType, PaymentMethod, BookingResult, UserBooking } from '../types'

export function useBooking() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const createBooking = useCallback(
    async (params: {
      telegramId:    number
      roomType:      RoomType
      checkIn:       string
      checkOut:      string
      guestName:     string
      guestPhone:    string
      guestsCount:   number
      paymentMethod: PaymentMethod
    }): Promise<BookingResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase.rpc('create_booking_miniapp', {
          p_telegram_id:    params.telegramId,
          p_room_type:      params.roomType,
          p_check_in:       params.checkIn,
          p_check_out:      params.checkOut,
          p_guest_name:     params.guestName,
          p_guest_phone:    params.guestPhone,
          p_guests_count:   params.guestsCount,
          p_payment_method: params.paymentMethod,
        })
        if (err) throw err
        return data as BookingResult
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка бронирования')
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const getUserBookings = useCallback(
    async (telegramId: number): Promise<UserBooking[]> => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase.rpc('get_user_bookings_miniapp', {
          p_telegram_id: telegramId,
        })
        if (err) throw err
        return (data ?? []) as UserBooking[]
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки')
        return []
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return { loading, error, createBooking, getUserBookings }
}
