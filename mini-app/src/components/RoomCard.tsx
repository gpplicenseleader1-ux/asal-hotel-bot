import type { Room, Language } from '../types'
import type { Translations } from '../i18n'

interface Props {
  room: Room
  lang: Language
  t: Translations
  nights: number
  onSelect: (room: Room) => void
}

const TYPE_EMOJI: Record<string, string> = { standard: '🏨', deluxe: '🌟', suite: '👑' }
const TYPE_COLOR: Record<string, string> = {
  standard: 'bg-blue-50 border-blue-200',
  deluxe: 'bg-amber-50 border-amber-200',
  suite: 'bg-purple-50 border-purple-200',
}

export function RoomCard({ room, lang, t, nights, onSelect }: Props) {
  const descKey = `description_${lang}` as keyof Room
  const description = (room[descKey] as string) || room.description_ru

  const typeLabel = {
    standard: t.standard,
    deluxe: t.deluxe,
    suite: t.suite,
  }[room.type]

  const totalPrice = room.price_per_night * (nights || 1)

  return (
    <div
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all active:scale-95 ${TYPE_COLOR[room.type]}`}
      onClick={() => onSelect(room)}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xl mr-1">{TYPE_EMOJI[room.type]}</span>
          <span className="font-semibold text-gray-900">{typeLabel}</span>
          <span className="text-gray-500 text-sm ml-2">№{room.room_number}</span>
        </div>
        <div className="text-right">
          <div className="font-bold text-brand-600 text-lg">${room.price_per_night}</div>
          <div className="text-xs text-gray-500">{t.perNight}</div>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-3 leading-relaxed">{description}</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex gap-3 text-gray-500">
          <span>🏢 {t.floor} {room.floor}</span>
          <span>👥 {t.maxGuests}: {room.max_guests}</span>
        </div>
        {nights > 0 && (
          <div className="font-semibold text-gray-900">
            {t.totalPrice}: <span className="text-brand-600">${totalPrice}</span>
          </div>
        )}
      </div>
    </div>
  )
}
