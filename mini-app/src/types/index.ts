export type Language = 'ru' | 'uz' | 'en'
export type RoomType = 'standard' | 'junior_suite' | 'suite'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type PaymentMethod = 'cash' | 'transfer' | 'card'

export type PaymentUI =
  | 'cash' | 'transfer'
  | 'visa_mc' | 'uzcard' | 'humo'
  | 'payme' | 'click' | 'mir' | 'sber'

export const PAYMENT_DB_MAP: Record<PaymentUI, PaymentMethod> = {
  cash:     'cash',
  transfer: 'transfer',
  visa_mc:  'card',
  uzcard:   'card',
  humo:     'card',
  payme:    'card',
  click:    'card',
  mir:      'card',
  sber:     'card',
}

export interface BookingResult {
  id: string
  room_number: string
  room_type: RoomType
  check_in: string
  check_out: string
  nights: number
  total_price: number
  status: string
  payment_method: string
  guest_name: string
  guest_phone: string
}

export interface UserBooking {
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
}

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface BookingSuccessData {
  bookingId: string
  roomNumber: string
  roomType: RoomType
  checkIn: string
  checkOut: string
  nights: number
  totalPrice: number
  guestName: string
  guestPhone?: string
  paymentMethod?: string
}
