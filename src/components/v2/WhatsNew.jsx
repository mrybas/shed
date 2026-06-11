import { Icon, Button } from '../ui.jsx'

// One-time "What's new" dialog: everything shipped between the version the
// user last saw and the current one. Items can deep-link into the Guide.
export default function WhatsNew({ t, entries, version, onClose, onOpenGuide }) {
  if (!entries?.length) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet whatsnew" role="dialog" aria-label={t('wnTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <span className="sheet-title">{t('wnTitle')} · {version}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>
        <div className="wn-list">
          {entries.map((entry) => (
            <div key={entry.version} className="wn-ver">
              <span className="wn-ver-tag num">{entry.version}</span>
              <ul className="wn-items">
                {entry.items.map((item, i) => (
                  <li key={i} className="wn-item">
                    <span className="wn-text">{item.text}</span>
                    {item.guide && (
                      <button className="wn-link" onClick={() => { onClose(); onOpenGuide(item.guide) }}>
                        {t('wnLearnMore')} <Icon name="chevright" className="ic-xs" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="wn-foot">
          <Button size="sm" onClick={() => { onClose(); onOpenGuide(null) }}>{t('wnOpenGuide')}</Button>
          <Button size="sm" variant="accent" onClick={onClose}>{t('wnGotIt')}</Button>
        </div>
      </div>
    </div>
  )
}
