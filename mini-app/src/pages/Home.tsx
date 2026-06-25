import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BedDouble, Star, Crown, ClipboardList } from 'lucide-react'
import type { Language, RoomType } from '../types'
import type { Translations } from '../i18n'

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

type LucideIcon = typeof BedDouble

interface RoomInfo {
  type:      RoomType
  price:     number
  maxGuests: number
  amenities: string[]
  BadgeIcon: LucideIcon
  accent:    string
}

const ROOMS: RoomInfo[] = [
  {
    type:      'standard',
    price:     60,
    maxGuests: 2,
    amenities: ['Wi-Fi', 'AC', 'Smart TV', 'Завтрак', 'Сейф', 'Душ'],
    BadgeIcon: BedDouble,
    accent:    'from-sand-light to-sand',
  },
  {
    type:      'junior_suite',
    price:     100,
    maxGuests: 3,
    amenities: ['Wi-Fi', 'AC', 'Smart TV 55″', 'Джакузи', 'Мини-бар', 'Завтрак'],
    BadgeIcon: Star,
    accent:    'from-terra-faint to-sand-light',
  },
  {
    type:      'suite',
    price:     160,
    maxGuests: 4,
    amenities: ['Wi-Fi', 'AC', 'Smart TV 65″', 'Джакузи', 'Дворецкий', 'Терраса', 'Завтрак'],
    BadgeIcon: Crown,
    accent:    'from-sand to-terra-faint',
  },
]

const LANGS: Language[] = ['ru', 'uz', 'en']

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const stagger = {
  animate: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const cardVariant = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE_OUT } },
}

interface Props {
  lang:         Language
  setLang:      (l: Language) => void
  t:            Translations
  onBook:       (roomType: RoomType) => void
  onMyBookings: () => void
}

export function Home({ lang, setLang, t, onBook, onMyBookings }: Props) {
  const reducedMotion = usePrefersReducedMotion()

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
    <div className="min-h-screen bg-offwhite">

      {/* ── Hero — background video ─────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
        {/*
          Static gradient fallback sits behind the video and is always visible
          while the video loads, or if the video is missing.
        */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #8A4B33 0%, #C56B4A 45%, #E8DCC8 100%)' }}
        />

        {/*
          Background video.
          - poster="/hero-video.mp4#t=0.001" gives iOS a first-frame thumbnail.
          - When prefers-reduced-motion is set, autoPlay is suppressed so the
            video stays on the first frame (static poster effect).
          - object-cover fills the container without distortion.
        */}
        <video
          src="/hero-video.mp4"
          autoPlay={!reducedMotion}
          muted
          loop
          playsInline
          poster="/hero-video.mp4#t=0.001"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          aria-hidden="true"
        />
        {/* Gradient overlay — stays on top of the future video too */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/55" />

        {/* Language switcher */}
        <div className="absolute top-4 right-4 flex gap-1 z-10">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-xs px-2.5 py-1.5 rounded-xl font-semibold transition-all duration-150 ${
                lang === l
                  ? 'bg-white text-terra'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Hero text */}
        <div className="relative z-10 flex flex-col items-center justify-end h-full px-5 pb-8 pt-14 text-center">
          <p className="label-caps text-white/60 mb-2 tracking-[0.35em]">Bukhara · Uzbekistan</p>
          <h1 className="font-serif text-white text-4xl font-semibold leading-tight drop-shadow-lg">
            Asal Boutique Hotel
          </h1>
          <p className="text-white/75 text-sm mt-2 leading-relaxed max-w-xs">{t.tagline}</p>
        </div>
      </div>

      {/* ── Ornamental divider ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex-1 h-px bg-sand" />
        <span className="text-terra font-serif text-base">✦</span>
        <div className="flex-1 h-px bg-sand" />
      </div>

      {/* ── Room cards (staggered) ─────────────────────────────────────── */}
      <motion.div
        className="px-4 pb-28 space-y-4"
        variants={stagger}
        initial="initial"
        animate="animate"
      >
        {ROOMS.map(({ type, price, maxGuests, amenities, BadgeIcon, accent }) => (
          <motion.div
            key={type}
            variants={cardVariant}
            whileTap={{ scale: 0.985 }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            className="card-premium"
          >
            {/* Card accent header */}
            <div className={`bg-gradient-to-r ${accent} px-5 py-4 border-b border-sand`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="label-caps text-terra-deep mb-1">
                    {type === 'suite' ? '✦ ' : ''}{roomLabel[type]}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-charcoal">${price}</span>
                    <span className="text-charcoal-mid text-sm">{t.perNight}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <BadgeIcon size={22} className="text-terra-deep" />
                  <p className="text-xs text-charcoal-mid">
                    {t.upTo} {maxGuests} {t.guestsShort}
                  </p>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              <p className="text-charcoal-mid text-sm leading-relaxed mb-4">{roomDesc[type]}</p>

              <div className="flex flex-wrap gap-1.5 mb-5">
                {amenities.map((a) => (
                  <span key={a} className="chip">{a}</span>
                ))}
              </div>

              <motion.button
                onClick={() => onBook(type)}
                className="btn-terra w-full flex items-center justify-center gap-2 text-base"
                whileTap={{ scale: 0.96 }}
              >
                {t.bookNow}
                <span className="text-lg leading-none">→</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Bottom nav ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur border-t border-sand px-4 py-3">
        <motion.button
          onClick={onMyBookings}
          className="btn-outline w-full flex items-center justify-center gap-2"
          whileTap={{ scale: 0.96 }}
        >
          <ClipboardList size={16} /> {t.myBookings}
        </motion.button>
      </div>
    </div>
  )
}
