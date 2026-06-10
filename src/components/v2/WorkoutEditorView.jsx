import { useState } from 'react'
import { Button, Icon, NumberStepper, Switch, Slider, Segmented } from '../ui.jsx'
import { CATEGORIES, catOf } from '../../data/catalogV2.js'

// Build/edit a custom workout: ordered blocks of catalog exercises with
// per-block tempo, trainers and a focus note. Saved to localStorage.
export default function WorkoutEditorView({ t, initial, exercises, onSave, onCancel }) {
  const [w, setW] = useState(initial)
  const upd = (patch) => setW((p) => ({ ...p, ...patch }))
  const updBlock = (i, patch) => setW((p) => ({
    ...p,
    blocks: p.blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
  }))
  const updSettings = (i, patch) => updBlock(i, { settings: { ...w.blocks[i].settings, ...patch } })

  const byCat = CATEGORIES.map((c) => ({
    cat: c,
    items: exercises.filter((e) => catOf(e) === c.id),
  })).filter((g) => g.items.length)

  const addBlock = () => setW((p) => ({
    ...p,
    blocks: [...p.blocks, {
      exerciseId: exercises[0]?.id, minutes: 3, note: '',
      settings: { bpm: 80 },
    }],
  }))
  const removeBlock = (i) => setW((p) => ({ ...p, blocks: p.blocks.filter((_, idx) => idx !== i) }))
  const moveBlock = (i, dir) => setW((p) => {
    const blocks = p.blocks.slice()
    const j = i + dir
    if (j < 0 || j >= blocks.length) return p
    ;[blocks[i], blocks[j]] = [blocks[j], blocks[i]]
    return { ...p, blocks }
  })

  const total = w.blocks.reduce((t2, b) => t2 + (b.minutes || 0), 0)
  const canSave = w.name.trim() && w.blocks.length > 0 && w.blocks.every((b) => b.exerciseId)

  const save = () => onSave({ ...w, name: w.name.trim(), minutes: total })

  return (
    <div className="workout wkedit" data-screen-label="Workout editor">
      <div className="prac-top">
        <button className="prac-back" onClick={onCancel}><Icon name="back" className="ic" /><span>{t('workouts')}</span></button>
      </div>

      <div className="prac-head">
        <div className="prac-titlewrap">
          <input className="input prac-name-input" value={w.name} onChange={(e) => upd({ name: e.target.value })} />
          <div className="prac-meta">
            <Segmented options={[
              { value: 'beginner', label: t('level_beginner') },
              { value: 'intermediate', label: t('level_intermediate') },
              { value: 'advanced', label: t('level_advanced') },
            ]} value={w.level} onChange={(v) => upd({ level: v })} />
            <span className="chip num">{total} {t('workoutMin')}</span>
          </div>
        </div>
        <Button variant="accent" icon="save" disabled={!canSave} onClick={save}>{t('save')}</Button>
      </div>

      <input className="input wkedit-desc" placeholder={t('wkeDescPh')} value={w.description}
        onChange={(e) => upd({ description: e.target.value })} />

      <div className="wk-blocks">
        {w.blocks.map((b, i) => {
          const s = b.settings || {}
          return (
            <div key={i} className="wke-block">
              <div className="wke-row">
                <span className="wk-block-idx num">{i + 1}</span>
                <select className="select wke-ex" value={b.exerciseId} onChange={(e) => updBlock(i, { exerciseId: e.target.value })}>
                  {byCat.map((g) => (
                    <optgroup key={g.cat.id} label={g.cat.label.en}>
                      {g.items.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <label className="ramp-field"><span className="ramp-cap">{t('workoutMin')}</span>
                  <NumberStepper value={b.minutes} min={1} max={30} onChange={(v) => updBlock(i, { minutes: v })} />
                </label>
                <label className="ramp-field"><span className="ramp-cap">{t('bpm')}</span>
                  <NumberStepper value={s.bpm || 80} min={40} max={260} onChange={(v) => updSettings(i, { bpm: v })} />
                </label>
                <span className="bar-acts">
                  <button className="bar-act" onClick={() => moveBlock(i, -1)} aria-label="up" title="↑"><Icon name="chevup" className="ic-xs" /></button>
                  <button className="bar-act" onClick={() => moveBlock(i, 1)} aria-label="down" title="↓"><Icon name="chevdown" className="ic-xs" /></button>
                  <button className="bar-act bar-del" onClick={() => removeBlock(i)} aria-label={t('delete')} title={t('delete')}><Icon name="trash" className="ic-xs" /></button>
                </span>
              </div>
              <div className="wke-row wke-trainers">
                <Switch checked={!!s.tempoRamp?.enabled}
                  onChange={(v) => updSettings(i, { tempoRamp: v ? { enabled: true, everyBars: 4, stepBpm: 5, maxBpm: (s.bpm || 80) + 30 } : undefined })}
                  label={t('tempoRamp')} icon="metro" />
                {s.tempoRamp?.enabled && (
                  <label className="ramp-field"><span className="ramp-cap">{t('maxTempo')}</span>
                    <NumberStepper value={s.tempoRamp.maxBpm} min={(s.bpm || 80) + 10} max={300}
                      onChange={(v) => updSettings(i, { tempoRamp: { ...s.tempoRamp, maxBpm: v } })} />
                  </label>
                )}
                <Switch checked={!!s.gapTrainer?.enabled}
                  onChange={(v) => updSettings(i, { gapTrainer: v ? { enabled: true, onBars: 2, offBars: 2 } : undefined })}
                  label={t('gapTrainer')} icon="metro" />
                <Switch checked={s.countIn?.mode === 'phrase'}
                  onChange={(v) => updSettings(i, { countIn: v ? { enabled: true, bars: 1, mode: 'phrase', feel: 'quarter' } : undefined })}
                  label={t('countInModePhrase')} icon="notes" />
                <label className="ramp-field wke-swing"><span className="ramp-cap">{t('swing')}</span>
                  <Slider value={s.swing || 0} min={0} max={100} onChange={(v) => updSettings(i, { swing: v || undefined })} aria-label={t('swing')} />
                  <span className="v-val num">{s.swing || 0}%</span>
                </label>
              </div>
              <input className="input wke-note" placeholder={t('wkeNotePh')} value={b.note}
                onChange={(e) => updBlock(i, { note: e.target.value })} />
            </div>
          )
        })}
        <button className="bar-add" onClick={addBlock}><Icon name="plus" className="ic" />{t('wkeAddBlock')}</button>
      </div>
    </div>
  )
}
