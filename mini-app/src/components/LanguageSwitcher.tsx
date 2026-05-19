import type { Language } from '../types'

interface Props {
  lang: Language
  onChange: (lang: Language) => void
}

const LANGS: Array<{ code: Language; flag: string; label: string }> = [
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'uz', flag: '🇺🇿', label: 'UZ' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
]

export function LanguageSwitcher({ lang, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {LANGS.map(({ code, flag, label }) => (
        <button
          key={code}
          onClick={() => onChange(code)}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            lang === code ? 'bg-brand-500 text-white' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  )
}
