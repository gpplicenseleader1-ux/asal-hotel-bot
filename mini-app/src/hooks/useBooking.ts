import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Room, Booking, BookingForm, RoomType } from '../types'

export function useBooking() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getAvailableRooms = useCallback(
    async (checkIn: string, checkOut: string, roomType?: RoomType): Promise<Room[]> => {
      setLoading(true)
      setError(null)
      try {
        let query = supabase
          .from('rooms')
          .select('*')
          .eq('is_active', true)
          .not(
            'id',
            'in',
            supabase
              .from('bookings')
              .select('room_id')
              .neq('status', 'cancelled')
              .lt('check_in_date', checkOut)
              .gt('check_out_date', checkIn),
          )

        if (roomType) {
          query = query.eq('type', roomType)
        }

        const { data, error: err } = await query.order('room_number')
        if (err) throw err
        return (data ?? []) as Room[]
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        return []
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const createBooking = useCallback(
    async (form: BookingForm & { user_id: string }): Promise<Booking | null> => {
      setLoading(true)
      setError(null)
      try {
        const checkIn = new Date(form.check_in_date)
        const checkOut = new Date(form.check_out_date)
        const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)

        const room = await supabase
          .from('rooms')
          .select('price_per_night')
          .eq('id', form.room_id)
          .single()

        if (room.error) throw room.error
        const total = Number(room.data.price_per_night) * nights

        const { data, error: err } = await supabase
          .from('bookings')
          .insert({
            user_id: form.user_id,
            room_id: form.room_id,
            room_type: form.room_type,
            check_in_date: form.check_in_date,
            check_out_date: form.check_out_date,
            nights_count: nights,
            total_price: total,
            guest_name: form.guest_name,
            guest_phone: form.guest_phone,
            guests_count: form.guests_count,
            payment_method: form.payment_method,
            source: 'miniapp',
          })
          .select()
          .single()

        if (err) throw err
        return data as Booking
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error')
        return null
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const getUserBookings = useCallback(async (userId: string): Promise<Booking[]> => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select('*, rooms(room_number, type)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (err) throw err
      return (data ?? []) as Booking[]
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const getOrCreateUser = useCallback(async (telegramId: number, fullName: string, username?: string) => {
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .single()

    if (existing) return existing

    const { data: created, error } = await supabase
      .from('users')
      .insert({ telegram_id: telegramId, full_name: fullName, username: username ?? '' })
      .select()
      .single()

    if (error) throw error
    return created
  }, [])

  return { loading, error, getAvailableRooms, createBooking, getUserBookings, getOrCreateUser }
}
