import { useRef, useState, useMemo } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { parseImported } from '../model/exercise.js'
import { filterExercises, groupExercises } from '../model/catalog.js'

const SUBDIV_FILTERS = ['all', 'eighth', 'triplet', 'sixteenth']
const TAG_FILTERS = ['all', 'singles', 'doubles', 'triples', 'quads', 'rudiment', 'groove']

export default function ExerciseLibrary({ builtins, saved, currentId, onLoad, onDelete, onImport }) {
  const { t } = useI18n()
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [subdivision, setSubdivision] = useState('all')
  const [tag, setTag] = useState('all')
  const [collapsed, setCollapsed] = useState({}) // key -> true when collapsed

  const all = useMemo(() => [...builtins, ...saved], [builtins, saved])
  const filtering = query.trim() !== '' || subdivision !== 'all' || tag !== 'all'
  const groups = useMemo(
    () => groupExercises(filterExercises(all, { query, subdivision, tag })),
    [all, query, subdivision, tag],
  )

  const isCollapsed = (key) => (filtering ? false : !!collapsed[key])
  const toggle = (key) => setCollapsed((c) => ({ ...c, [key]: !c[key] }))

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const ex = parseImported(String(reader.result))
        setError('')
        onImport(ex)
      } catch (err) {
        setError(t('importError') + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const label = (prefix, key) => t(`${prefix}_${key}`)

  return (
    <div className="library">
      <div className="lib-head">
        <h3>{t('library')}</h3>
        <button className="lib-import" onClick={() => fileRef.current?.click()}>⬆ {t('import')}</button>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      {error && <p className="error">{error}</p>}

      <input
        className="lib-search"
        type="search"
        placeholder={t('searchPlaceholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="filter-chips">
        {SUBDIV_FILTERS.map((s) => (
          <button key={s} className={`chip ${subdivision === s ? 'active' : ''}`} onClick={() => setSubdivision(s)}>
            {s === 'all' ? t('all') : t(s)}
          </button>
        ))}
      </div>
      <div className="filter-chips">
        {TAG_FILTERS.map((tg) => (
          <button key={tg} className={`chip ${tag === tg ? 'active' : ''}`} onClick={() => setTag(tg)}>
            {tg === 'all' ? t('all') : label('tag', tg)}
          </button>
        ))}
      </div>

      <div className="lib-tree">
        {groups.length === 0 && <p className="muted">{t('noResults')}</p>}
        {groups.map((g) => (
          <div key={g.source} className="lib-source">
            <button className="lib-source-head" onClick={() => toggle(g.source)}>
              <span className="caret">{isCollapsed(g.source) ? '▸' : '▾'}</span>
              {label('src', g.source)}
              <span className="lib-count">{g.count}</span>
            </button>
            {!isCollapsed(g.source) && g.sections.map((sec) => {
              const key = `${g.source}/${sec.section}`
              return (
                <div key={key} className="lib-section">
                  <button className="lib-section-head" onClick={() => toggle(key)}>
                    <span className="caret">{isCollapsed(key) ? '▸' : '▾'}</span>
                    {label('sec', sec.section)}
                    <span className="lib-count">{sec.exercises.length}</span>
                  </button>
                  {!isCollapsed(key) && (
                    <ul className="lib-list">
                      {sec.exercises.map((ex) => (
                        <li key={ex.id} className={`lib-item ${ex.id === currentId ? 'current' : ''}`}>
                          <button className="lib-load" onClick={() => onLoad(ex)}>
                            <span className="lib-name">
                              {ex.number != null && <span className="lib-num">#{ex.number}</span>}
                              {ex.name}
                            </span>
                            <span className="lib-meta">
                              {(ex.sticking || []).join('').slice(0, 16) || `${ex.timeSignature.beats}/${ex.timeSignature.unit}`}
                            </span>
                          </button>
                          {ex.source === 'user' && (
                            <button className="lib-delete" title={t('delete')} onClick={() => onDelete(ex.id)}>✕</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
