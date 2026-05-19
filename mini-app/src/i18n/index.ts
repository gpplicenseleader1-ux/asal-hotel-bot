import { ru } from './ru'
import { uz } from './uz'
import { en } from './en'
import type { Translations } from './ru'
import type { Language } from '../types'

const translations: Record<Language, Translations> = { ru, uz, en }

export function useTranslations(lang: Language): Translations {
  return translations[lang] ?? translations.ru
}

export type { Translations }
export { ru, uz, en }
