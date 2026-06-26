import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RoomType, PaymentMethod, BookingResult, UserBooking, BookingStatus } from '../types'

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
      const tg = window.Telegram?.WebApp
      setLoading(true)
      setError(null)
      try {
        console.error('[createBooking] tg user:', JSON.stringify(tg?.initDataUnsafe?.user))

        // Direct .insert() is blocked by RLS (anon JWT has no telegram_id claim).
        // create_booking_miniapp is SECURITY DEFINER — bypasses RLS safely.
        const { data, error: rpcErr } = await supabase.rpc('create_booking_miniapp', {
          p_telegram_id:    params.telegramId,
          p_room_type:      params.roomType,
          p_check_in:       params.checkIn,
          p_check_out:      params.checkOut,
          p_guest_name:     params.guestName,
          p_guest_phone:    params.guestPhone,
          p_guests_count:   params.guestsCount,
          p_payment_method: params.paymentMethod,
        })
        if (rpcErr) throw rpcErr
        if (!data) return null

        return {
          id:             data.id as string,
          room_number:    data.room_number as string,
          room_type:      data.room_type as RoomType,
          check_in:       data.check_in as string,
          check_out:      data.check_out as string,
          nights:         data.nights as number,
          total_price:    data.total_price as number,
          status:         data.status as string,
          payment_method: data.payment_method as string,
          guest_name:     data.guest_name as string,
          guest_phone:    data.guest_phone as string,
        }
      } catch (e) {
        console.error('[createBooking] RPC failed:', JSON.stringify(e, null, 2))
        const err = e as { message?: string }
        setError(err?.message || 'Ошибка бронирования')
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
        // Direct .select() is also blocked by RLS for the same reason.
        // get_user_bookings_miniapp is SECURITY DEFINER — bypasses RLS safely.
        const { data, error: err } = await supabase.rpc('get_user_bookings_miniapp', {
          p_telegram_id: telegramId,
        })
        if (err) throw err
        return (data ?? []).map((b: {
          id: string
          room_number: string
          room_type: RoomType
          check_in: string
          check_out: string
          nights: number
          total_price: number
          status: BookingStatus
          payment_method: PaymentMethod
          guest_name: string
          created_at: string
        }) => ({
          id:             b.id,
          room_number:    b.room_number,
          room_type:      b.room_type,
          check_in:       b.check_in,
          check_out:      b.check_out,
          nights:         b.nights,
          total_price:    b.total_price,
          status:         b.status,
          payment_method: b.payment_method,
          guest_name:     b.guest_name,
          created_at:     b.created_at,
        } as UserBooking))
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
