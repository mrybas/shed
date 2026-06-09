import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useScheduler } from '../hooks/useScheduler.js'
import { useSpacebar } from '../hooks/useSpacebar.js'
import TransportControls from './TransportControls.jsx'
import SequencerGrid from './SequencerGrid.jsx'
import NotationView from './NotationView.jsx'
import ExerciseLibrary from './ExerciseLibrary.jsx'
import ToggleButton from './ToggleButton.jsx'
import { AccentIcon, MetronomeIcon, NoteIcon } from './icons.jsx'
import { getBuiltinExercises } from '../data/builtinExercises.js'
import { getStickControlExercises } from '../data/stickControl.js'
import {
  createEmptyExercise,
  resizeExercise,
  exportExercise,
  loadLibrary,
  saveToLibrary,
  deleteFromLibrary,
  genId,
  INSTRUMENTS,
  totalSteps,
} from '../model/exercise.js'

const clone = (ex) => JSON.parse(JSON.stringify(ex))

export default function ExercisesPage() {
  const { t } = useI18n()
  const builtins = [...getBuiltinExercises(), ...getStickControlExercises()]

  const [exercise, setExercise] = useState(() => clone(builtins[0]))
  const [saved, setSaved] = useState(() => loadLibrary())
  const [accentFirst, setAccentFirst] = useState(true)
  const [metronomeEnabled, setMetronomeEnabled] = useState(true)
  const [soundSubdivisions, setSoundSubdivisions] = useState(false)
  const [metronomeVolume, setMetronomeVolume] = useState(1.2)
  const [exerciseVolume, setExerciseVolume] = useState(1)
  const [view, setView] = useState('notes') // 'notes' | 'grid'

  const sched = useScheduler({
    bpm: builtins[0].bpm,
    timeSignature: builtins[0].timeSignature,
    subdivision: builtins[0].subdivision,
    pattern: clone(builtins[0]),
    metronomeEnabled: true,
    accentFirst: true,
  })

  // Sync scheduler with exercise + toggles (live while playing).
  useEffect(() => { sched.setPattern(exercise) }, [exercise, sched])
  useEffect(() => { sched.setBpm(exercise.bpm) }, [exercise.bpm, sched])
  useEffect(() => { sched.setTimeSignature(exercise.timeSignature) }, [exercise.timeSignature, sched])
  useEffect(() => { sched.setSubdivision(exercise.subdivision) }, [exercise.subdivision, sched])
  useEffect(() => { sched.setAccentFirst(accentFirst) }, [accentFirst, sched])
  useEffect(() => { sched.setMetronomeEnabled(metronomeEnabled) }, [metronomeEnabled, sched])
  useEffect(() => { sched.setSoundSubdivisions(soundSubdivisions) }, [soundSubdivisions, sched])
  useEffect(() => { sched.setMetronomeVolume(metronomeVolume) }, [metronomeVolume, sched])
  useEffect(() => { sched.setPatternVolume(exerciseVolume) }, [exerciseVolume, sched])

  useSpacebar(sched.toggle)

  const refreshSaved = useCallback(() => setSaved(loadLibrary()), [])

  const onToggleCell = (inst, step) => {
    setExercise((ex) => {
      const rows = { ...ex.rows, [inst]: ex.rows[inst].map((c, i) => {
        if (i !== step) return c
        // off -> on -> on+accent -> off
        if (!c.on) return { on: true, accent: false }
        if (!c.accent) return { on: true, accent: true }
        return { on: false, accent: false }
      }) }
      return { ...ex, rows }
    })
  }

  const onCycleSticking = (step) => {
    setExercise((ex) => {
      const next = ex.sticking[step] === '' ? 'R' : ex.sticking[step] === 'R' ? 'L' : ''
      const sticking = ex.sticking.map((s, i) => (i === step ? next : s))
      return { ...ex, sticking }
    })
  }

  const loadExercise = (ex) => {
    if (sched.isPlaying) sched.stop()
    setExercise(clone(ex))
  }

  const handleBpm = (v) => setExercise((ex) => ({ ...ex, bpm: v }))
  const handleTimeSignature = (ts) => setExercise((ex) => resizeExercise(ex, ts, ex.subdivision))
  const handleSubdivision = (sub) => setExercise((ex) => resizeExercise(ex, ex.timeSignature, sub))
  const handleName = (e) => setExercise((ex) => ({ ...ex, name: e.target.value }))

  const newExercise = () => {
    if (sched.isPlaying) sched.stop()
    setExercise(createEmptyExercise({ name: t('newExercise') }))
  }

  const clearGrid = () => {
    setExercise((ex) => {
      const n = totalSteps(ex.timeSignature, ex.subdivision)
      const rows = {}
      INSTRUMENTS.forEach((k) => { rows[k] = Array.from({ length: n }, () => ({ on: false, accent: false })) })
      return { ...ex, rows, sticking: Array.from({ length: n }, () => '') }
    })
  }

  const saveCurrent = () => {
    let ex = exercise
    // Builtins are read-only; saving makes an owned copy under "My exercises".
    if (ex.id.startsWith('builtin') || ex.id.startsWith('dci') || ex.id.startsWith('sc_')) {
      ex = { ...ex, id: genId(), source: 'user', section: null, number: null }
      setExercise(ex)
    }
    saveToLibrary(ex)
    refreshSaved()
  }

  const handleDelete = (id) => {
    deleteFromLibrary(id)
    refreshSaved()
  }

  return (
    <div className="page exercises-page">
      <div className="exercises-layout">
        <aside className="sidebar">
          <ExerciseLibrary
            builtins={builtins}
            saved={saved}
            currentId={exercise.id}
            onLoad={loadExercise}
            onDelete={handleDelete}
            onImport={loadExercise}
          />
        </aside>

        <main className="editor">
          <div className="editor-header">
            <input
              className="name-input"
              value={exercise.name}
              onChange={handleName}
              placeholder={t('name')}
            />
            <div className="editor-actions">
              <button onClick={newExercise}>＋ {t('newExercise')}</button>
              <button onClick={clearGrid}>{t('clear')}</button>
              <button onClick={saveCurrent}>💾 {t('save')}</button>
              <button onClick={() => exportExercise(exercise)}>⬇ {t('export')}</button>
            </div>
          </div>

          <TransportControls
            bpm={exercise.bpm}
            onBpm={handleBpm}
            timeSignature={exercise.timeSignature}
            onTimeSignature={handleTimeSignature}
            subdivision={exercise.subdivision}
            onSubdivision={handleSubdivision}
            isPlaying={sched.isPlaying}
            onToggle={sched.toggle}
          />

          <div className="options-row">
            <ToggleButton
              active={metronomeEnabled}
              onToggle={setMetronomeEnabled}
              icon={<MetronomeIcon />}
              title={t('playMetronomeWithExercise')}
            >
              {t('playMetronomeWithExercise')}
            </ToggleButton>
            {metronomeEnabled && (
              <>
                <ToggleButton
                  active={accentFirst}
                  onToggle={setAccentFirst}
                  icon={<AccentIcon />}
                  title={t('accentFirst')}
                >
                  {t('accentFirst')}
                </ToggleButton>
                <ToggleButton
                  active={soundSubdivisions}
                  onToggle={setSoundSubdivisions}
                  icon={<NoteIcon type="eighth" />}
                  title={t('countSubdivisions')}
                >
                  {t('countSubdivisions')}
                </ToggleButton>
              </>
            )}
          </div>

          <div className="volumes-row">
            <div className="volume-control">
              <label>
                🥁 {t('exerciseVolume')}: <strong>{Math.round(exerciseVolume * 100)}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={exerciseVolume}
                aria-label={t('exerciseVolume')}
                onChange={(e) => setExerciseVolume(Number(e.target.value))}
              />
            </div>
            {metronomeEnabled && (
              <div className="volume-control">
                <label>
                  <MetronomeIcon /> {t('metronomeVolume')}: <strong>{Math.round(metronomeVolume * 100)}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={metronomeVolume}
                  aria-label={t('metronomeVolume')}
                  onChange={(e) => setMetronomeVolume(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          <div className="view-toggle">
            <button
              className={view === 'notes' ? 'active' : ''}
              onClick={() => setView('notes')}
            >
              ♪ {t('notesView')}
            </button>
            <button
              className={view === 'grid' ? 'active' : ''}
              onClick={() => setView('grid')}
            >
              ▦ {t('gridView')}
            </button>
          </div>

          {view === 'notes' ? (
            <>
              <NotationView exercise={exercise} currentStep={sched.currentStep} />
              <p className="muted hint">{t('editInGridHint')}</p>
            </>
          ) : (
            <>
              <SequencerGrid
                exercise={exercise}
                currentStep={sched.currentStep}
                onToggleCell={onToggleCell}
                onCycleSticking={onCycleSticking}
              />
              <p className="muted hint">{t('cellHint')}</p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
