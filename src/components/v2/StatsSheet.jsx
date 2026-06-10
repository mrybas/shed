import { getDayMap, getRecentExercises, getTempoHistories } from '../../model/progress.js'
import { CAT, catOf } from '../../data/catalogV2.js'

// Daily minutes, one bar per day.
function DayBars({ days, t }) {
  const w = 420; const h = 90; const pad = 14
  const max = Math.max(60, ...days.map((d) => d.seconds / 60))
  const bw = (w - pad * 2) / days.length
  return (
    <svg className="st-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={t('stDaily')}>
      {days.map((d, i) => {
        const min = d.seconds / 60
        const bh = min > 0 ? Math.max(2, (min / max) * (h - 24)) : 0
        return (
          <g key={d.d}>
            {bh > 0 && (
              <rect x={pad + i * bw + 1} y={h - 16 - bh} width={Math.max(2, bw - 2)} height={bh}
                rx="1.5" fill="var(--accent)">
                <title>{d.d}: {Math.round(min)} min</title>
              </rect>
            )}
          </g>
        )
      })}
      <text x={pad} y={h - 3} className="st-axis">−{days.length}d</text>
      <text x={w - pad} y={h - 3} className="st-axis" textAnchor="end">{t('stToday')}</text>
    </svg>
  )
}

// Horizontal minutes-per-category bars.
function CatBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.minutes))
  return (
    <div className="st-cats">
      {rows.map((r) => (
        <div className="st-cat-row" key={r.key}>
          <span className="st-cat-name">{r.name}</span>
          <span className="st-cat-track">
            <span className="st-cat-fill" style={{ width: `${(r.minutes / max) * 100}%`, background: r.hue }} />
          </span>
          <span className="st-cat-min num">{r.minutes}′</span>
        </div>
      ))}
    </div>
  )
}

// Tempo history line for one exercise.
function TempoLine({ name, best, history, t }) {
  const w = 420; const h = 64; const pad = 10
  const vals = history.map((p) => p.bpm)
  const min = Math.min(...vals); const max = Math.max(...vals)
  const span = Math.max(1, max - min)
  const pts = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, vals.length - 1)
    const y = h - 14 - ((v - min) * (h - 28)) / span
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <div className="st-tempo">
      <div className="st-tempo-head">
        <span className="st-tempo-name">{name}</span>
        <span className="st-tempo-best num">★ {best} {t('bpm')}</span>
      </div>
      <svg className="st-chart" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function StatsSheet({ t, lang, open, onClose, exercisesById }) {
  if (!open) return null
  const days = getDayMap(4) // last 4 weeks
  const byEx = getRecentExercises(28)
  const nameOf = (id) => (id === 'metronome' ? t('metronome') : exercisesById?.get(id)?.name || id)

  // Aggregate minutes by technique category (metronome is its own bucket).
  const catMinutes = new Map()
  byEx.forEach(({ exId, seconds }) => {
    let key = 'metronome'
    let name = t('metronome')
    let hue = 'var(--text-3)'
    const ex = exercisesById?.get(exId)
    if (ex) {
      const cat = CAT(catOf(ex))
      key = cat ? cat.id : 'other'
      name = cat ? (cat.label[lang] || cat.label.en) : t('stOther')
      hue = cat ? cat.hue : 'var(--text-3)'
    } else if (exId !== 'metronome') {
      key = 'other'; name = t('stOther')
    }
    const cur = catMinutes.get(key) || { key, name, hue, minutes: 0 }
    cur.minutes += seconds / 60
    catMinutes.set(key, cur)
  })
  const catRows = [...catMinutes.values()]
    .map((r) => ({ ...r, minutes: Math.round(r.minutes) }))
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6)

  const tempos = getTempoHistories(3)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet stats-sheet" role="dialog" aria-label={t('stTitle')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <span className="sheet-title">{t('stTitle')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>

        <span className="field-label">{t('stDaily')}</span>
        <DayBars days={days.slice(-28)} t={t} />

        {catRows.length > 0 && (
          <>
            <span className="field-label">{t('stByCat')}</span>
            <CatBars rows={catRows} />
          </>
        )}

        {tempos.length > 0 && (
          <>
            <span className="field-label">{t('stTempo')}</span>
            {tempos.map((x) => (
              <TempoLine key={x.exId} name={nameOf(x.exId)} best={x.best} history={x.history} t={t} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
