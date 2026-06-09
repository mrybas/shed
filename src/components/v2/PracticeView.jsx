import { useState, useEffect, useRef } from 'react'
import { Slider, NumberStepper, NotePicker, Segmented, Switch, Button, Icon } from '../ui.jsx'
import NotationView from '../NotationView.jsx'
import { TIME_SIGS } from './util.js'
import { CAT, catOf, sigOf } from '../../data/catalogV2.js'
import { INSTRUMENTS, resizeExercise, setBeatSub, beatRanges } from '../../model/exercise.js'
import { sigToTimeSignature } from './util.js'

const INSTR_COLORS = {
  crash: 'oklch(0.72 0.13 320)', ride: 'oklch(0.74 0.12 250)', hihatOpen: 'oklch(0.78 0.13 95)',
  hihatClosed: 'oklch(0.74 0.12 175)', snare: 'oklch(0.7 0.16 38)', kick: 'oklch(0.6 0.04 260)',
}

export default function PracticeView({
  t, lang, item, setItem, options, setOptions, vols, setVols, playing, step,
  progress, onProgress, onDuplicate, onBack, onSave, onExport, onNew, savedFlash,
}) {
  const editable = item.source === 'user'
  const [view, setView] = useState(editable ? 'grid' : 'notes')
  useEffect(() => { setView(editable ? 'grid' : 'notes') }, [item.id, editable])

  const per = item.rows[INSTRUMENTS[0]].length
  const ranges = beatRanges(item)
  const beatStartSet = new Set(ranges.map((r) => r.start))
  const beatOfStart = new Map(ranges.map((r) => [r.start, r.beat]))
  const cat = CAT(catOf(item))
  const sig = sigOf(item)

  const setBpm = (b) => setItem((p) => ({ ...p, bpm: b }))
  const setSig = (s) => setItem((p) => resizeExercise(p, sigToTimeSignature(s), p.subdivision))
  const setSub = (s) => setItem((p) => resizeExercise(p, p.timeSignature, s))
  const setOneBeatSub = (b, s) => setItem((p) => setBeatSub(p, b, s))

  // Roll type currently authored (open/closed); also restamps existing rolls.
  const hasClosed = INSTRUMENTS.some((k) => item.rows[k].some((c) => c.roll === 'closed'))
  const rollType = hasClosed ? 'closed' : 'open'

  // off -> on -> accent -> roll -> off
  const cycleCell = (k, i) => setItem((prev) => {
    const rows = { ...prev.rows, [k]: prev.rows[k].map((c, idx) => {
      if (idx !== i) return c
      if (!c.on) return { on: true, accent: false, roll: 0 }
      if (!c.accent && !c.roll) return { on: true, accent: true, roll: 0 }
      if (c.accent) return { on: true, accent: false, roll: rollType }
      return { on: false, accent: false, roll: 0 }
    }) }
    return { ...prev, rows }
  })

  const toggleRollType = (closed) => setItem((prev) => {
    const next = closed ? 'closed' : 'open'
    const rows = {}
    INSTRUMENTS.forEach((k) => { rows[k] = prev.rows[k].map((c) => (c.roll ? { ...c, roll: next } : c)) })
    return { ...prev, rows }
  })
  const cycleStick = (i) => setItem((prev) => {
    const next = prev.sticking[i] === '' ? 'R' : prev.sticking[i] === 'R' ? 'L' : ''
    return { ...prev, sticking: prev.sticking.map((s, idx) => (idx === i ? next : s)) }
  })
  const clearCells = () => setItem((prev) => {
    const rows = {}
    INSTRUMENTS.forEach((k) => { rows[k] = prev.rows[k].map(() => ({ on: false, accent: false, roll: 0 })) })
    return { ...prev, rows, sticking: prev.sticking.map(() => '') }
  })

  const tapRef = useRef([])
  const tap = () => {
    const now = performance.now()
    const arr = tapRef.current.filter((x) => now - x < 2200)
    arr.push(now); tapRef.current = arr
    if (arr.length >= 2) {
      const d = arr.slice(1).map((x, i) => x - arr[i])
      const avg = d.reduce((a, b) => a + b, 0) / d.length
      const bpm = Math.round(60000 / avg)
      if (bpm >= 30 && bpm <= 300) setBpm(bpm)
    }
  }

  const localPlay = playing ? step : -1

  // Bring the notation/grid into view when playback starts, so the playhead is
  // visible without scrolling past the controls.
  const playAreaRef = useRef(null)
  useEffect(() => {
    if (playing) playAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [playing])

  return (
    <div className="practice" data-screen-label="Practice">
      <div className="prac-top">
        <button className="prac-back" onClick={onBack}><Icon name="back" className="ic" /><span>{t('backToLibrary')}</span></button>
      </div>

      <div className="prac-head">
        <div className="prac-titlewrap">
          {editable
            ? <input className="input prac-name-input" value={item.name} onChange={(e) => setItem((p) => ({ ...p, name: e.target.value }))} />
            : <h1 className="prac-name">{item.name}</h1>}
          <div className="prac-meta">
            {cat && <span className="chip"><span className="chip-dot" style={{ background: cat.hue }} />{cat.label[lang] || cat.label.en}</span>}
            <span className="chip num">{sig}</span>
            {item.number != null && <span className="chip chip-source"><Icon name="bookmark" className="ic-xs" />#{item.number}</span>}
            {(item.tags || []).map((tg) => <span key={tg} className="chip chip-tag">#{t(`tag_${tg}`)}</span>)}
          </div>
        </div>
        <div className="prac-progress">
          <button className={'prog-btn' + (progress === 'practiced' ? ' is-on' : '')} onClick={() => onProgress(progress === 'practiced' ? 'none' : 'practiced')}>
            <Icon name="checkcircle" className="ic" /><span>{t('practiced')}</span>
          </button>
          <button className={'prog-btn prog-master' + (progress === 'mastered' ? ' is-on' : '')} onClick={() => onProgress(progress === 'mastered' ? 'none' : 'mastered')}>
            <Icon name="star" className="ic" /><span>{t('mastered')}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="prac-controls">
          <div className="tempo-block">
            <span className="field-label">{t('tempo')} · {t('bpm')}</span>
            <div className="tempo-row">
              <Slider value={item.bpm} min={30} max={260} onChange={setBpm} aria-label={t('tempo')} />
              <NumberStepper value={item.bpm} min={30} max={260} onChange={setBpm} />
            </div>
            <Button icon="tap" onClick={tap} style={{ alignSelf: 'start' }}>{t('tapTempo')}</Button>
          </div>
          <div className="meter-block">
            <div className="blk">
              <span className="field-label">{t('timeSig')}</span>
              {editable
                ? <select className="select" value={sig} onChange={(e) => setSig(e.target.value)}>{TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                : <div className="static-field num">{sig}</div>}
            </div>
            <div className="blk">
              <span className="field-label">{t('subdivision')}</span>
              {editable ? <NotePicker value={item.subdivision} onChange={setSub} /> : <div className="static-field num">{t(item.subdivision)}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <span className="field-label">{t('options')}</span>
        <div className="toggles" style={{ marginTop: 'var(--s-2)' }}>
          <Switch checked={options.metroWith} onChange={(v) => setOptions((o) => ({ ...o, metroWith: v }))} label={t('playMetronomeWithExercise')} icon="metro" />
          <Switch checked={options.accentOne} onChange={(v) => setOptions((o) => ({ ...o, accentOne: v }))} label={t('accentFirst')} icon="accent" />
          <Switch checked={options.soundSubs} onChange={(v) => setOptions((o) => ({ ...o, soundSubs: v }))} label={t('countSubdivisions')} icon="notes" />
          {editable && <Switch checked={rollType === 'closed'} onChange={toggleRollType} label={t('closedRolls')} icon="grid" />}
        </div>

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        {(() => {
          const ramp = options.tempoRamp || { enabled: false, everyBars: 4, stepBpm: 5, maxBpm: 0 }
          const setRamp = (patch) => setOptions((o) => ({ ...o, tempoRamp: { ...ramp, ...patch } }))
          return (
            <div className="ramp-block">
              <Switch checked={ramp.enabled} onChange={(v) => setRamp({ enabled: v })} label={t('tempoRamp')} icon="metro" />
              <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('tempoRampHint')}</div>
              {ramp.enabled && (
                <div className="ramp-fields" style={{ marginTop: 'var(--s-3)' }}>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('everyBars')}</span>
                    <NumberStepper value={ramp.everyBars} min={1} max={64} onChange={(v) => setRamp({ everyBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('increaseBy')}</span>
                    <NumberStepper value={ramp.stepBpm} min={1} max={50} onChange={(v) => setRamp({ stepBpm: v })} />
                    <span className="ramp-cap">{t('bpm')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('maxTempo')}</span>
                    <NumberStepper value={ramp.maxBpm || 0} min={0} max={400} onChange={(v) => setRamp({ maxBpm: v })} />
                    <span className="ramp-cap">{ramp.maxBpm ? t('bpm') : t('noLimit')}</span>
                  </label>
                </div>
              )}
            </div>
          )
        })()}

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        {(() => {
          const gap = options.gapTrainer || { enabled: false, onBars: 2, offBars: 2 }
          const setGap = (patch) => setOptions((o) => ({ ...o, gapTrainer: { ...gap, ...patch } }))
          return (
            <div className="ramp-block">
              <Switch checked={gap.enabled} onChange={(v) => setGap({ enabled: v })} label={t('gapTrainer')} icon="metro" />
              <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('gapTrainerHint')}</div>
              {gap.enabled && (
                <div className="ramp-fields" style={{ marginTop: 'var(--s-3)' }}>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('clickOn')}</span>
                    <NumberStepper value={gap.onBars} min={1} max={16} onChange={(v) => setGap({ onBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('clickOff')}</span>
                    <NumberStepper value={gap.offBars} min={1} max={16} onChange={(v) => setGap({ offBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                </div>
              )}
            </div>
          )
        })()}

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        <span className="field-label">{t('volumes')}</span>
        <div className="vol-pair" style={{ marginTop: 'var(--s-2)' }}>
          <div>
            <div className="muted-line" style={{ marginBottom: 6 }}>{t('exerciseVolume')}</div>
            <div className="volume-row"><Icon name="vol" className="v-ic" /><Slider value={vols.ex} min={0} max={200} onChange={(v) => setVols((s) => ({ ...s, ex: v }))} aria-label={t('exerciseVolume')} /><span className="v-val num">{vols.ex}%</span></div>
          </div>
          <div>
            <div className="muted-line" style={{ marginBottom: 6 }}>{t('metronomeVolume')}</div>
            <div className="volume-row"><Icon name="metro" className="v-ic" /><Slider value={vols.metro} min={0} max={200} onChange={(v) => setVols((s) => ({ ...s, metro: v }))} aria-label={t('metronomeVolume')} /><span className="v-val num">{vols.metro}%</span></div>
          </div>
        </div>
      </div>

      <div className="view-bar">
        <Segmented accent options={[{ value: 'notes', label: t('notesView'), icon: 'notes' }, { value: 'grid', label: t('gridView'), icon: 'grid' }]} value={view} onChange={setView} />
        <div className="view-actions">
          {editable ? (
            <>
              <Button size="sm" icon="plus" onClick={onNew}>{t('newExercise')}</Button>
              <Button size="sm" icon="clear" onClick={clearCells}>{t('clear')}</Button>
              <Button size="sm" icon="download" onClick={onExport}>{t('export')}</Button>
              <Button size="sm" icon="save" variant={savedFlash ? 'accent' : 'default'} onClick={onSave}>{savedFlash ? t('saved_ok') : t('save')}</Button>
            </>
          ) : (
            <>
              <Button size="sm" icon="download" onClick={onExport}>{t('export')}</Button>
              <Button size="sm" icon="copy" onClick={onDuplicate}>{t('duplicate')}</Button>
            </>
          )}
        </div>
      </div>

      {(view === 'notes') ? (
        <div ref={playAreaRef}>
          <div className="notation-wrap"><NotationView exercise={item} currentStep={localPlay} /></div>
          <div className="notation-hint">{editable ? t('editInGridHint') : t('viewOnly')}</div>
        </div>
      ) : (
        <div className="seq" ref={playAreaRef}>
          {editable && (
            <div className="beat-feel">
              {ranges.map((r) => (
                <div className="beat-feel-item" key={r.beat}>
                  <span className="beat-feel-label num">{r.beat + 1}</span>
                  <NotePicker value={r.sub} onChange={(s) => setOneBeatSub(r.beat, s)} />
                </div>
              ))}
            </div>
          )}
          <div className="seq-ruler"><div />
            <div className="ticks">{Array.from({ length: per }).map((_, i) => (
              <div key={i} className={'tick' + (beatStartSet.has(i) ? ' beat' : '') + (localPlay === i ? ' play' : '')}>{beatStartSet.has(i) ? beatOfStart.get(i) + 1 : '·'}</div>
            ))}</div>
          </div>
          <div className="seq-grid">
            {INSTRUMENTS.map((k) => (
              <div className="seq-row" key={k}>
                <div className="seq-rowlabel"><span className="dot" style={{ background: INSTR_COLORS[k] }} />{t(k)}</div>
                <div className="seq-cells">
                  {item.rows[k].map((cell, i) => (
                    <button key={i} disabled={!editable} aria-label={t(k) + ' ' + (i + 1)}
                      className={['cell', cell.roll ? 'roll' : cell.accent ? 'accent' : cell.on ? 'on' : '', beatStartSet.has(i) ? 'beat-start' : '', localPlay === i ? 'play-col' : '', !editable ? 'ro' : ''].join(' ')}
                      onClick={() => editable && cycleCell(k, i)}>{cell.roll ? 'z' : ''}</button>
                  ))}
                </div>
              </div>
            ))}
            <div className="seq-row">
              <div className="seq-rowlabel" style={{ fontWeight: 700, color: 'var(--text)' }}>{t('sticking')}</div>
              <div className="seq-cells">
                {item.sticking.map((s, i) => (
                  <button key={i} disabled={!editable}
                    className={['cell', 'stick', s, beatStartSet.has(i) ? 'beat-start' : '', localPlay === i ? 'play-col' : '', !editable ? 'ro' : ''].join(' ')}
                    onClick={() => editable && cycleStick(i)}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
