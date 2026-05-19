export type Language = 'ru' | 'uz' | 'en'
export type RoomType = 'standard' | 'deluxe' | 'suite'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentMethod = 'cash' | 'transfer' | 'card'
export type LoyaltyStatus = 'base' | 'silver' | 'gold'

export interface Room {
  id: string
  room_number: string
  type: RoomType
  floor: number
  price_per_night: number
  max_guests: number
  description_ru: string
  description_uz: string
  description_en: string
  amenities: string[]
  photos: string[]
  is_active: boolean
}

export interface User {
  id: string
  telegram_id: number
  username: string | null
  full_name: string
  phone: string | null
  language: Language
  loyalty_status: LoyaltyStatus
  nights_count: number
  discount_percent: number
  created_at: string
}

export interface Booking {
  id: string
  user_id: string
  room_id: string
  room_type: RoomType
  check_in_date: string
  check_out_date: string
  nights_count: number
  total_price: number
  guest_name: string
  guest_phone: string
  guests_count: number
  payment_method: PaymentMethod
  payment_status: string
  status: BookingStatus
  source: string
  created_at: string
  rooms?: Pick<Room, 'room_number' | 'type'>
}

export interface BookingForm {
  room_id: string
  room_type: RoomType
  check_in_date: string
  check_out_date: string
  guests_count: number
  guest_name: string
  guest_phone: string
  payment_method: PaymentMethod
}

export interface AvailabilityQuery {
  room_type: RoomType
  check_in: string
  check_out: string
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}
