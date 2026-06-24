import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RoomType, PaymentMethod, BookingResult, UserBooking } from '../types'

const ROOM_PRICE: Record<RoomType, number> = {
  standard:     60,
  junior_suite: 100,
  suite:        160,
}

type RoomRow = { id: string; room_number?: string }
type RoomsJoin = { room_number: string; type: string } | null

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
        // Find an available room (same RPC the bot uses)
        const { data: roomData, error: roomErr } = await supabase.rpc('first_available_room', {
          p_type:      params.roomType,
          p_check_in:  params.checkIn,
          p_check_out: params.checkOut,
        })
        if (roomErr) throw roomErr
        // RPC may return single object or single-element array
        const room = (Array.isArray(roomData) ? roomData[0] : roomData) as RoomRow | null
        if (!room?.id) {
          setError('Нет свободных номеров на выбранные даты')
          return null
        }

        const nights = Math.round(
          (new Date(params.checkOut).getTime() - new Date(params.checkIn).getTime()) / 86400000,
        )
        const totalPrice = nights * ROOM_PRICE[params.roomType]

        // Insert booking directly — same field names the bot uses
        const { data, error: insertErr } = await supabase
          .from('bookings')
          .insert({
            user_telegram_id: params.telegramId,
            room_id:          room.id,
            room_type:        params.roomType,
            check_in:         params.checkIn,
            check_out:        params.checkOut,
            nights,
            total_price:      totalPrice,
            guest_name:       params.guestName,
            guest_phone:      params.guestPhone,
            guests_count:     params.guestsCount,
            payment_method:   params.paymentMethod,
            payment_status:   'pending',
            status:           'confirmed',
            source:           'miniapp',
          })
          .select('*, rooms(room_number, type)')
          .single()

        if (insertErr) throw insertErr
        if (!data) return null

        const roomsJoin = (data as { rooms: RoomsJoin }).rooms

        return {
          id:             data.id as string,
          room_number:    roomsJoin?.room_number ?? room.room_number ?? '?',
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
        // Same query the bot uses, with room join for room_number
        const { data, error: err } = await supabase
          .from('bookings')
          .select('*, rooms(room_number, type)')
          .eq('user_telegram_id', telegramId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (err) throw err
        return (data ?? []).map((b) => {
          const roomsJoin = (b as { rooms: RoomsJoin }).rooms
          return {
            id:             b.id as string,
            room_number:    roomsJoin?.room_number ?? '?',
            room_type:      b.room_type as RoomType,
            check_in:       b.check_in as string,
            check_out:      b.check_out as string,
            nights:         b.nights as number,
            total_price:    b.total_price as number,
            status:         b.status as string,
            payment_method: b.payment_method as string,
            guest_name:     b.guest_name as string,
            created_at:     b.created_at as string,
          } as UserBooking
        })
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
