import { createContext, useContext, useCallback } from 'react'
import { translations } from './translations.js'

// English-only. Kept as a thin context so components can call t(key) unchanged.
const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const t = useCallback((key) => translations.en[key] ?? key, [])
  return (
    <I18nContext.Provider value={{ lang: 'en', setLang: () => {}, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
