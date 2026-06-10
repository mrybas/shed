import { useCallback } from 'react'
import { Slider, NumberStepper, NotePicker, NoteGlyph, Switch, Button, Icon } from '../ui.jsx'
import { BeatDots } from './PlayerBar.jsx'
import { TIME_SIGS, parseSig } from './util.js'
import { useTapTempo } from '../../hooks/useTapTempo.js'

// Beat groupings that make musical sense per meter (e.g. 8/8 as 3+3+2).
const ACCENT_PRESETS = {
  5: ['3+2', '2+3'],
  6: ['3+3', '2+2+2'],
  7: ['2+2+3', '3+2+2', '2+3+2'],
  8: ['3+3+2', '2+3+3', '3+2+3'],
  12: ['3+3+3+3', '4+4+4'],
}
const groupingToAccents = (g, beats) => {
  const arr = Array.from({ length: beats }, () => false)
  let i = 0
  g.split('+').forEach((n) => { if (i < beats) arr[i] = true; i += Number(n) })
  return arr
}

export default function MetronomeView({ t, metro, setMetro, playing, step, liveSub }) {
  const set = (patch) => setMetro((m) => ({ ...m, ...patch }))
  const tap = useTapTempo(useCallback((bpm) => setMetro((m) => ({ ...m, bpm })), [setMetro]))
  const beats = parseSig(metro.sig).num
  // Tap a beat dot to toggle its accent; the pattern starts from the plain
  // "accent the downbeat" default.
  const toggleAccent = (b) => setMetro((m) => {
    const base = m.accents && m.accents.length === beats
      ? [...m.accents]
      : Array.from({ length: beats }, (_, i) => i === 0 && m.accentOne)
    base[b] = !base[b]
    return { ...m, accents: base }
  })
  const presets = ACCENT_PRESETS[beats] || []
  const accentsEqual = (a, b) => a && b && a.length === b.length && a.every((v, i) => !!v === !!b[i])

  return (
    <div className="metroview" data-screen-label="Metronome">
      <h1 className="page-title">{t('simpleMetro')}</h1>

      <div className="metro-stage">
        <div className="metro-bpm">
          <span className="metro-bpm-val num">{metro.bpm}</span>
          <span className="metro-bpm-unit">{t('bpm')}</span>
        </div>
        <div className="metro-bigbeats">
          <BeatDots sig={metro.sig} sub={playing && liveSub ? liveSub : metro.sub} step={step} playing={playing}
            accents={metro.accents && metro.accents.length === beats ? metro.accents : null}
            onToggleBeat={toggleAccent} />
        </div>
        {(presets.length > 0 || metro.accents) && (
          <div className="accent-presets">
            <span className="muted-line">{t('accentTapHint')}</span>
            {presets.map((g) => {
              const arr = groupingToAccents(g, beats)
              const on = accentsEqual(metro.accents, arr)
              return (
                <button key={g} className={'fchip' + (on ? ' is-active' : '')}
                  onClick={() => set({ accents: arr })}>{g}</button>
              )
            })}
            {metro.accents && (
              <button className="fchip" onClick={() => set({ accents: null })}>{t('accentReset')}</button>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <div className="prac-controls">
          <div className="tempo-block">
            <span className="field-label">{t('tempo')} · {t('bpm')}</span>
            <div className="tempo-row">
              <Slider value={metro.bpm} min={30} max={260} onChange={(b) => set({ bpm: b })} aria-label={t('tempo')} />
              <NumberStepper value={metro.bpm} min={30} max={260} onChange={(b) => set({ bpm: b })} />
            </div>
            <Button icon="tap" onClick={tap} style={{ alignSelf: 'start' }}>{t('tapTempo')}</Button>
          </div>
          <div className="meter-block">
            <div className="blk">
              <span className="field-label">{t('timeSig')}</span>
              <select className="select" value={metro.sig} onChange={(e) => set({ sig: e.target.value, accents: null })}>
                {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="blk">
              <span className="field-label">{t('subdivision')}</span>
              <NotePicker value={metro.sub} onChange={(s) => set({ sub: s })} />
            </div>
          </div>
        </div>

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />

        <div className="ramp-block" style={{ marginBottom: 'var(--s-5)' }}>
          <Switch checked={!!metro.switcher?.enabled}
            onChange={(v) => set({ switcher: { ...metro.switcher, enabled: v } })}
            label={t('subSwitcher')} icon="notes" />
          <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('subSwitcherHint')}</div>
          {metro.switcher?.enabled && (
            <div className="ramp-fields" style={{ marginTop: 'var(--s-3)', alignItems: 'center' }}>
              <label className="ramp-field">
                <span className="ramp-cap">{t('everyBars')}</span>
                <NumberStepper value={metro.switcher.everyBars} min={1} max={16}
                  onChange={(v) => set({ switcher: { ...metro.switcher, everyBars: v } })} />
                <span className="ramp-cap">{t('barsUnit')}</span>
              </label>
              <div className="seg notepick">
                {['quarter', 'eighth', 'triplet', 'sixteenth'].map((k) => {
                  const on = metro.switcher.subs.includes(k)
                  return (
                    <button key={k} className={'seg-item' + (on ? ' is-active' : '')} aria-label={k}
                      onClick={() => {
                        const subs = on ? metro.switcher.subs.filter((x) => x !== k) : [...metro.switcher.subs, k]
                        if (subs.length >= 2) set({ switcher: { ...metro.switcher, subs } })
                      }}>
                      <NoteGlyph kind={k} />
                    </button>
                  )
                })}
              </div>
              {playing && liveSub && <span className="pb-muted-pill">{t(liveSub)}</span>}
            </div>
          )}
        </div>

        <div className="ramp-block" style={{ marginBottom: 'var(--s-5)' }}>
          <Switch checked={!!metro.poly?.enabled}
            onChange={(v) => set({ poly: { ...metro.poly, enabled: v } })}
            label={t('polyrhythm')} icon="metro" />
          <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('polyHint')}</div>
          {metro.poly?.enabled && (
            <div className="ramp-fields" style={{ marginTop: 'var(--s-3)', alignItems: 'center' }}>
              <span className="ramp-cap num">{(metro.sig || '4/4').split('/')[0]} :</span>
              <NumberStepper value={metro.poly.against} min={2} max={7}
                onChange={(v) => set({ poly: { ...metro.poly, against: v } })} />
            </div>
          )}
        </div>

        <div className="ctl-grid">
          <div className="group col-7">
            <span className="field-label">{t('options')}</span>
            <div className="toggles">
              <Switch checked={metro.accentOne} onChange={(v) => set({ accentOne: v, accents: null })} label={t('accentFirst')} icon="accent" />
              <Switch checked={metro.soundSubs} onChange={(v) => set({ soundSubs: v })} label={t('countSubdivisions')} icon="notes" />
            </div>
          </div>
          <div className="group col-5">
            <span className="field-label">{t('metronomeVolume')}</span>
            <div className="volume-row">
              <Icon name="vol" className="v-ic" />
              <Slider value={metro.vol} min={0} max={200} onChange={(v) => set({ vol: v })} aria-label={t('metronomeVolume')} />
              <span className="v-val num">{metro.vol}%</span>
            </div>
            <span className="field-label" style={{ marginTop: 'var(--s-3)' }}>{t('swing')}</span>
            <div className="volume-row">
              <Icon name="notes" className="v-ic" />
              <Slider value={metro.swing || 0} min={0} max={100} onChange={(v) => set({ swing: v })} aria-label={t('swing')} />
              <span className="v-val num">{metro.swing || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
