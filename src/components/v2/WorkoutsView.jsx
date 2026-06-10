import { useState, useEffect } from 'react'
import { Button, Icon } from '../ui.jsx'
import { WORKOUTS } from '../../data/workouts.js'
import { getStreak, getWeekMinutes, getDayMap, getRecentExercises, getTempoGoals } from '../../model/progress.js'

const LEVEL_HUES = {
  beginner: 'oklch(0.72 0.17 150)',
  intermediate: 'oklch(0.78 0.14 78)',
  advanced: 'oklch(0.65 0.18 25)',
}

// 12-week practice heatmap: one column per week, one cell per day.
function Heatmap({ days }) {
  const bucket = (sec) => (sec === 0 ? 0 : sec < 300 ? 1 : sec < 900 ? 2 : sec < 1800 ? 3 : 4)
  return (
    <div className="pr-heatmap" aria-hidden="true">
      {days.map((d) => (
        <span key={d.d} className={`pr-cell l${bucket(d.seconds)}`} title={`${d.d}: ${Math.round(d.seconds / 60)} min`} />
      ))}
    </div>
  )
}

function ProgressPanel({ t, exercisesById }) {
  // Journal lives outside React — refresh the panel every few seconds.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((v) => v + 1), 5000)
    return () => clearInterval(id)
  }, [])
  const streak = getStreak()
  const week = getWeekMinutes()
  const days = getDayMap(12)
  const recent = getRecentExercises(7).slice(0, 5)
  const goals = getTempoGoals().filter((g) => g.best < g.goal).slice(0, 5)
  const nameOf = (id) => (id === 'metronome' ? t('metronome') : exercisesById?.get(id)?.name || id)
  return (
    <div className="pr-panel">
      <div className="pr-stats">
        <div className="pr-stat"><span className="pr-num num">🔥 {streak}</span><span className="pr-cap">{t('prStreak')}</span></div>
        <div className="pr-stat"><span className="pr-num num">{week}</span><span className="pr-cap">{t('prWeek')}</span></div>
      </div>
      <Heatmap days={days} />
      {goals.length > 0 && (
        <div className="pr-recent pr-goals">
          <span className="pr-cap">{t('prGoals')}</span>
          {goals.map((g) => (
            <span key={g.exId} className="pr-recent-row">
              <span className="pr-recent-name">{nameOf(g.exId)}</span>
              <span className="pr-goal-track"><span className="pr-goal-fill" style={{ width: `${Math.min(100, (g.best / g.goal) * 100)}%` }} /></span>
              <span className="num">{g.best || 0}/{g.goal}</span>
            </span>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="pr-recent">
          <span className="pr-cap">{t('prRecent')}</span>
          {recent.map((r) => (
            <span key={r.exId} className="pr-recent-row">
              <span className="pr-recent-name">{nameOf(r.exId)}</span>
              <span className="num">{Math.max(1, Math.round(r.seconds / 60))} {t('workoutMin')}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutCard({ t, w, onOpen, onEdit, onDelete }) {
  return (
    <button className="wk-card" onClick={() => onOpen(w.id)}>
      <span className="wk-card-head">
        <span className="level-dot" style={{ background: LEVEL_HUES[w.level] }} />
        <span className="wk-card-name">{w.name}</span>
        <span className="wk-card-min num">{w.minutes}′</span>
      </span>
      <span className="wk-card-desc">{w.description}</span>
      <span className="wk-card-meta num">{w.blocks.length} {t('workoutBlocks')} · {t(`level_${w.level}`)}</span>
      {(onEdit || onDelete) && (
        <span className="wk-card-acts">
          {onEdit && <span role="button" tabIndex={0} className="rowact" aria-label={t('wkeEdit')} onClick={(e) => { e.stopPropagation(); onEdit(w) }}><Icon name="grid" className="ic" /></span>}
          {onDelete && <span role="button" tabIndex={0} className="rowact del" aria-label={t('delete')} onClick={(e) => { e.stopPropagation(); onDelete(w.id) }}><Icon name="trash" className="ic" /></span>}
        </span>
      )}
    </button>
  )
}

export default function WorkoutsView({ t, exercisesById, onOpenWorkout, myWorkouts = [], onNew, onEdit, onDelete, daily, onOpenDaily }) {
  const byLevel = (lv) => WORKOUTS.filter((w) => w.level === lv)
  return (
    <div className="lib2-home" data-screen-label="Workouts">
      <h1 className="page-title">{t('workouts')}</h1>
      <ProgressPanel t={t} exercisesById={exercisesById} />
      {daily && (
        <button className="daily-card" onClick={onOpenDaily}>
          <span className="daily-icon"><Icon name="star" className="ic" /></span>
          <span className="daily-main">
            <span className="daily-title">{t('dailyTitle')}</span>
            <span className="daily-sub">{t('sightReading')} · {t(`level_${daily.genLevel}`)} · {daily.bpm} {t('bpm')}</span>
          </span>
          <span className="daily-go"><Icon name="chevright" className="ic" /></span>
        </button>
      )}
      <p className="wk-desc">{t('workoutsIntro')}</p>

      <div className="sec-row" style={{ marginTop: 'var(--s-4)' }}>
        <span className="sec-label">{t('wkMine')}</span>
        <Button size="sm" variant="accent" icon="plus" onClick={onNew}>{t('wkeNew')}</Button>
      </div>
      {myWorkouts.length > 0 && (
        <div className="wk-grid">
          {myWorkouts.map((w) => (
            <WorkoutCard key={w.id} t={t} w={w} onOpen={onOpenWorkout} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}

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
