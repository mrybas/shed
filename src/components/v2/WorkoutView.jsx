import { Button, Icon } from '../ui.jsx'

const LEVEL_HUES = {
  beginner: 'oklch(0.72 0.17 150)',
  intermediate: 'oklch(0.78 0.14 78)',
  advanced: 'oklch(0.65 0.18 25)',
}

// Short human summary of a block's playback settings.
function settingsSummary(s, t) {
  const parts = []
  if (s.bpm) parts.push(`${s.bpm} ${t('bpm')}`)
  if (s.tempoRamp?.enabled) parts.push(`↗ ${s.tempoRamp.maxBpm} (${t('tempoRamp')})`)
  if (s.gapTrainer?.enabled) parts.push(`${t('gapTrainer')} ${s.gapTrainer.onBars}/${s.gapTrainer.offBars}`)
  if (s.swing) parts.push(`${t('swing')} ${s.swing}%`)
  if (s.countIn?.mode === 'phrase') parts.push(t('countInModePhrase'))
  return parts.join(' · ')
}

export default function WorkoutView({ t, workout, exercisesById, onStart, onBack, onOpenExercise, onEdit, onDuplicate, onExport }) {
  if (!workout) return null
  return (
    <div className="workout" data-screen-label="Workout">
      <div className="prac-top">
        <button className="prac-back" onClick={onBack}><Icon name="back" className="ic" /><span>{t('backToLibrary')}</span></button>
      </div>

      <div className="prac-head">
        <div className="prac-titlewrap">
          <h1 className="prac-name">{workout.name}</h1>
          <div className="prac-meta">
            <span className="chip"><span className="chip-dot" style={{ background: LEVEL_HUES[workout.level] }} />{t(`level_${workout.level}`)}</span>
            <span className="chip num">{workout.minutes} {t('workoutMin')}</span>
            <span className="chip num">{workout.blocks.length} {t('workoutBlocks')}</span>
          </div>
        </div>
        <div className="wkv-acts">
          {workout.custom && onEdit && <Button icon="grid" onClick={() => onEdit(workout)}>{t('wkeEdit')}</Button>}
          {!workout.custom && onDuplicate && <Button icon="copy" onClick={() => onDuplicate(workout)}>{t('wkeDuplicate')}</Button>}
          {onExport && <Button icon="download" onClick={() => onExport(workout)}>{t('export')}</Button>}
          <Button variant="accent" icon="play" onClick={() => onStart(workout.id)}>{t('workoutStart')}</Button>
        </div>
      </div>

      <p className="wk-desc">{workout.description}</p>

      <div className="wk-blocks">
        {workout.blocks.map((b, i) => {
          const ex = exercisesById.get(b.exerciseId)
          return (
            <button key={i} className="wk-block" onClick={() => ex && onOpenExercise(ex)}>
              <span className="wk-block-idx num">{i + 1}</span>
              <span className="wk-block-main">
                <span className="wk-block-name">{ex ? ex.name : b.exerciseId}</span>
                <span className="wk-block-note">{b.note}</span>
              </span>
              <span className="wk-block-meta">
                <span className="num">{b.minutes} {t('workoutMin')}</span>
                <span className="wk-block-set">{settingsSummary(b.settings, t)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
