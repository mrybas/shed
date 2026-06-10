import { WORKOUTS } from '../../data/workouts.js'

const LEVEL_HUES = {
  beginner: 'oklch(0.72 0.17 150)',
  intermediate: 'oklch(0.78 0.14 78)',
  advanced: 'oklch(0.65 0.18 25)',
}

function WorkoutCard({ t, w, onOpen }) {
  return (
    <button className="wk-card" onClick={() => onOpen(w.id)}>
      <span className="wk-card-head">
        <span className="level-dot" style={{ background: LEVEL_HUES[w.level] }} />
        <span className="wk-card-name">{w.name}</span>
        <span className="wk-card-min num">{w.minutes}′</span>
      </span>
      <span className="wk-card-desc">{w.description}</span>
      <span className="wk-card-meta num">{w.blocks.length} {t('workoutBlocks')} · {t(`level_${w.level}`)}</span>
    </button>
  )
}

export default function WorkoutsView({ t, onOpenWorkout }) {
  const byLevel = (lv) => WORKOUTS.filter((w) => w.level === lv)
  return (
    <div className="lib2-home" data-screen-label="Workouts">
      <h1 className="page-title">{t('workouts')}</h1>
      <p className="wk-desc">{t('workoutsIntro')}</p>
      {['beginner', 'intermediate', 'advanced'].map((lv) => (
        <div key={lv}>
          <div className="sec-label" style={{ marginTop: 'var(--s-5)' }}>
            <span className="level-dot" style={{ background: LEVEL_HUES[lv], marginRight: 6 }} />{t(`level_${lv}`)}
          </div>
          <div className="wk-grid">
            {byLevel(lv).map((w) => <WorkoutCard key={w.id} t={t} w={w} onOpen={onOpenWorkout} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
