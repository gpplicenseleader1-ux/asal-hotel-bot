import type { Room, Language, RoomType } from '../types'
import type { Translations } from '../i18n'
import { RoomCard } from './RoomCard'

interface Props {
  rooms: Room[]
  lang: Language
  t: Translations
  nights: number
  activeType: RoomType | 'all'
  onTypeChange: (type: RoomType | 'all') => void
  onSelect: (room: Room) => void
  loading: boolean
}

const FILTERS: Array<{ key: RoomType | 'all'; emoji: string; labelKey: keyof Translations }> = [
  { key: 'all', emoji: '🏨', labelKey: 'allTypes' },
  { key: 'standard', emoji: '🏨', labelKey: 'standard' },
  { key: 'deluxe', emoji: '🌟', labelKey: 'deluxe' },
  { key: 'suite', emoji: '👑', labelKey: 'suite' },
]

export function RoomGrid({ rooms, lang, t, nights, activeType, onTypeChange, onSelect, loading }: Props) {
  const filtered = activeType === 'all' ? rooms : rooms.filter((r) => r.type === activeType)

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {FILTERS.map(({ key, emoji, labelKey }) => (
          <button
            key={key}
            onClick={() => onTypeChange(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeType === key
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {key === 'all' ? t[labelKey] as string : `${emoji} ${t[labelKey] as string}`}
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">{t.loading}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">{t.noRooms}</div>
        ) : (
          filtered.map((room) => (
            <RoomCard key={room.id} room={room} lang={lang} t={t} nights={nights} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}
