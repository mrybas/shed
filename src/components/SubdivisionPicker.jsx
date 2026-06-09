import { useI18n } from '../i18n/I18nContext.jsx'
import { NoteIcon } from './icons.jsx'

const ITEMS = ['quarter', 'eighth', 'triplet', 'sixteenth']

// Segmented picker showing note-value icons instead of a dropdown.
export default function SubdivisionPicker({ value, onChange, disabled }) {
  const { t } = useI18n()
  return (
    <div className="control subdiv-picker">
      <label>{t('subdivision')}</label>
      <div className="subdiv-btns">
        {ITEMS.map((v) => (
          <button
            key={v}
            type="button"
            className={value === v ? 'active' : ''}
            aria-label={t(v)}
            aria-pressed={value === v}
            title={t(v)}
            disabled={disabled}
            onClick={() => onChange(v)}
          >
            <NoteIcon type={v} />
          </button>
        ))}
      </div>
    </div>
  )
}
