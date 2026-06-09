import { useI18n } from '../i18n/I18nContext.jsx'

export default function Nav({ tab, onTab }) {
  const { t, lang, setLang } = useI18n()
  return (
    <header className="nav">
      <div className="brand">🥁 {t('appTitle')}</div>
      <nav className="tabs">
        <button className={tab === 'metronome' ? 'active' : ''} onClick={() => onTab('metronome')}>
          {t('tabMetronome')}
        </button>
        <button className={tab === 'exercises' ? 'active' : ''} onClick={() => onTab('exercises')}>
          {t('tabExercises')}
        </button>
      </nav>
      <div className="lang-switch">
        <button className={lang === 'uk' ? 'active' : ''} onClick={() => setLang('uk')}>UA</button>
        <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
      </div>
    </header>
  )
}
