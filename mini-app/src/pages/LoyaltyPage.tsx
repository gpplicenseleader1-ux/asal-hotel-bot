import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User, Language } from '../types'
import type { Translations } from '../i18n'
import { useBooking } from '../hooks/useBooking'
import { useTelegram } from '../hooks/useTelegram'

interface Props {
  lang: Language
  t: Translations
}

const TIERS = [
  { key: 'base', min: 0, max: 9, discount: 0, emoji: '⚪', color: 'bg-gray-100' },
  { key: 'silver', min: 10, max: 29, discount: 5, emoji: '🥈', color: 'bg-slate-100' },
  { key: 'gold', min: 30, max: Infinity, discount: 10, emoji: '🥇', color: 'bg-amber-100' },
]

export function LoyaltyPage({ lang: _lang, t }: Props) {
  const navigate = useNavigate()
  const { user } = useTelegram()
  const { getOrCreateUser, loading } = useBooking()
  const [dbUser, setDbUser] = useState<User | null>(null)

  useEffect(() => {
    if (!user) return
    getOrCreateUser(user.id, `${user.first_name} ${user.last_name ?? ''}`.trim(), user.username)
      .then(setDbUser)
  }, [user, getOrCreateUser])

  const nights = dbUser?.nights_count ?? 0
  const currentTier = dbUser?.loyalty_status ?? 'base'
  const discount = dbUser?.discount_percent ?? 0

  const tierLabel: Record<string, string> = {
    base: t.loyaltyBase,
    silver: t.loyaltySilver,
    gold: t.loyaltyGold,
  }

  const progress = currentTier === 'gold' ? 100 : currentTier === 'silver' ? Math.min(100, ((nights - 10) / 20) * 100) : Math.min(100, (nights / 10) * 100)
  const nextTierNights = currentTier === 'base' ? 10 - nights : currentTier === 'silver' ? 30 - nights : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-gray-500 text-xl">←</button>
        <h1 className="font-semibold text-gray-900">💎 {t.loyaltyProgram}</h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8 text-gray-400">{t.loading}</div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-6 text-white text-center">
              <div className="text-4xl mb-2">
                {currentTier === 'gold' ? '🥇' : currentTier === 'silver' ? '🥈' : '⚪'}
              </div>
              <div className="text-xl font-bold mb-1">
                {dbUser?.full_name || user?.first_name}
              </div>
              <div className="text-brand-200 mb-4">{t.loyaltyStatus}: {tierLabel[currentTier]}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="text-2xl font-bold">{nights}</div>
                  <div className="text-sm text-brand-200">{t.loyaltyNights}</div>
                </div>
                <div className="bg-white/20 rounded-xl p-3">
                  <div className="text-2xl font-bold">{discount}%</div>
                  <div className="text-sm text-brand-200">{t.loyaltyDiscount}</div>
                </div>
              </div>
            </div>

            {currentTier !== 'gold' && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">{tierLabel[currentTier]}</span>
                  <span className="text-gray-600">{tierLabel[currentTier === 'base' ? 'silver' : 'gold']}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {nextTierNights} {t.nights} → {tierLabel[currentTier === 'base' ? 'silver' : 'gold']}
                </p>
              </div>
            )}

            <div className="space-y-2">
              {TIERS.map(({ key, min, max, discount: d, emoji, color }) => (
                <div
                  key={key}
                  className={`rounded-2xl p-4 border-2 ${color} ${currentTier === key ? 'border-brand-400' : 'border-transparent'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{emoji}</span>
                      <div>
                        <div className="font-semibold">{tierLabel[key]}</div>
                        <div className="text-sm text-gray-500">
                          {max === Infinity ? `${min}+` : `${min}–${max}`} {t.nights}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-brand-600">{d}%</div>
                      <div className="text-xs text-gray-500">{t.loyaltyDiscount}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 pb-4">{t.loyaltyInfo} 🌹</p>
          </>
        )}
      </div>
    </div>
  )
}
