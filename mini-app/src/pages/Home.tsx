import type { Language, RoomType } from '../types'
import type { Translations } from '../i18n'

interface RoomInfo {
  type: RoomType
  price: number
  maxGuests: number
  amenities: string[]
  headerBg: string
  badge: string
}

const ROOMS: RoomInfo[] = [
  {
    type:      'standard',
    price:     60,
    maxGuests: 2,
    amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Завтрак', 'Сейф', 'Душ'],
    headerBg:  'from-amber-50 to-gold-faint',
    badge:     '🏨',
  },
  {
    type:      'junior_suite',
    price:     100,
    maxGuests: 3,
    amenities: ['Wi-Fi', 'AC', 'Smart TV 55"', 'Джакузи', 'Мини-бар', 'Завтрак'],
    headerBg:  'from-gold-faint to-gold-pale',
    badge:     '⭐',
  },
  {
    type:      'suite',
    price:     160,
    maxGuests: 4,
    amenities: ['Wi-Fi', 'AC', 'Smart TV 65"', 'Джакузи', 'Дворецкий', 'Терраса', 'Завтрак'],
    headerBg:  'from-gold-pale to-amber-200',
    badge:     '👑',
  },
]

const LANGS: Language[] = ['ru', 'uz', 'en']

interface Props {
  lang: Language
  setLang: (l: Language) => void
  t: Translations
  onBook: (roomType: RoomType) => void
  onMyBookings: () => void
}

export function Home({ lang, setLang, t, onBook, onMyBookings }: Props) {
  const roomLabel: Record<RoomType, string> = {
    standard:     t.standard,
    junior_suite: t.juniorSuite,
    suite:        t.suite,
  }

  const roomDesc: Record<RoomType, string> = {
    standard:     t.standardDesc,
    junior_suite: t.juniorSuiteDesc,
    suite:        t.suiteDesc,
  }

  return (
    <div className="min-h-screen bg-beige">
      {/* ── Hero Header ── */}
      <div className="relative bg-brown px-5 pt-10 pb-10 text-center overflow-hidden">
        {/* Decorative dots */}
        <div className="absolute top-5 left-6 text-gold-pale opacity-30 text-5xl select-none">✦</div>
        <div className="absolute top-14 right-5 text-gold-pale opacity-20 text-3xl select-none">◆</div>
        <div className="absolute bottom-5 left-1/3 text-gold-pale opacity-20 text-2xl select-none">✦</div>

        {/* Language switcher */}
        <div className="absolute top-4 right-4 flex gap-1">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                lang === l
                  ? 'bg-gold text-white'
                  : 'text-gold-pale opacity-60 hover:opacity-100'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Logo */}
        <img src="/logo.png" alt="Asal Boutique Hotel" className="h-20 object-contain mx-auto" />
        <p className="text-gold-light text-xs mt-1.5 tracking-[0.25em] uppercase">
          Bukhara · Uzbekistan
        </p>
        <p className="text-beige-deep text-xs mt-2 opacity-60">{t.tagline}</p>
      </div>

      {/* ── Divider ── */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex-1 h-px bg-beige-dark" />
        <span className="text-gold text-base">✦</span>
        <div className="flex-1 h-px bg-beige-dark" />
      </div>

      {/* ── Room Cards ── */}
      <div className="px-4 pb-28 space-y-4">
        {ROOMS.map(({ type, price, maxGuests, amenities, headerBg, badge }) => (
          <div key={type} className="card-hotel">
            {/* Card header */}
            <div className={`bg-gradient-to-r ${headerBg} px-5 py-4 border-b border-beige-dark`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gold-light font-medium tracking-[0.25em] uppercase mb-0.5">
                    {type === 'suite' ? '✦ ' : ''}{roomLabel[type]}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-brown">${price}</span>
                    <span className="text-brown-light text-sm">{t.perNight}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl">{badge}</span>
                  <p className="text-xs text-brown-light mt-1">
                    {t.upTo} {maxGuests} {t.guestsShort}
                  </p>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              <p className="text-brown-mid text-sm leading-relaxed mb-4">
                {roomDesc[type]}
              </p>

              {/* Amenity chips */}
              <div className="flex flex-wrap gap-1.5 mb-5">
                {amenities.map((a) => (
                  <span
                    key={a}
                    className="text-xs bg-gold-faint text-brown-mid px-2.5 py-1 rounded-full border border-gold-pale"
                  >
                    {a}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => onBook(type)}
                className="btn-gold w-full gap-2 text-base"
              >
                {t.bookNow}
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Nav ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-beige-dark px-4 py-3 safe-area-bottom">
        <button
          onClick={onMyBookings}
          className="btn-outline w-full gap-2"
        >
          <span>📋</span> {t.myBookings}
        </button>
      </div>
    </div>
  )
}
