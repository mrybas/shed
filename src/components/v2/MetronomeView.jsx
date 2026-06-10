import { useCallback } from 'react'
import { Slider, NumberStepper, NotePicker, Switch, Button, Icon } from '../ui.jsx'
import { BeatDots } from './PlayerBar.jsx'
import { TIME_SIGS } from './util.js'
import { useTapTempo } from '../../hooks/useTapTempo.js'

export default function MetronomeView({ t, metro, setMetro, playing, step }) {
  const set = (patch) => setMetro((m) => ({ ...m, ...patch }))
  const tap = useTapTempo(useCallback((bpm) => setMetro((m) => ({ ...m, bpm })), [setMetro]))

  return (
    <div className="metroview" data-screen-label="Metronome">
      <h1 className="page-title">{t('simpleMetro')}</h1>

      <div className="metro-stage">
        <div className="metro-bpm">
          <span className="metro-bpm-val num">{metro.bpm}</span>
          <span className="metro-bpm-unit">{t('bpm')}</span>
        </div>
        <div className="metro-bigbeats">
          <BeatDots sig={metro.sig} sub={metro.sub} step={step} playing={playing} />
        </div>
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
              <select className="select" value={metro.sig} onChange={(e) => set({ sig: e.target.value })}>
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

        <div className="ctl-grid">
          <div className="group col-7">
            <span className="field-label">{t('options')}</span>
            <div className="toggles">
              <Switch checked={metro.accentOne} onChange={(v) => set({ accentOne: v })} label={t('accentFirst')} icon="accent" />
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
          </div>
        </div>
      </div>
    </div>
  )
}
