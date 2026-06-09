import { useState, useEffect } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import { useScheduler } from '../hooks/useScheduler.js'
import { useSpacebar } from '../hooks/useSpacebar.js'
import { stepsPerBeat } from '../model/exercise.js'
import TransportControls from './TransportControls.jsx'
import { MetronomeIcon } from './icons.jsx'

export default function MetronomePage() {
  const { t } = useI18n()
  const [bpm, setBpm] = useState(100)
  const [timeSignature, setTimeSignature] = useState({ beats: 4, unit: 4 })
  const [subdivision, setSubdivision] = useState('quarter')
  const [accentFirst, setAccentFirst] = useState(true)
  const [soundSubdivisions, setSoundSubdivisions] = useState(true)
  const [volume, setVolume] = useState(1)

  const sched = useScheduler({
    bpm: 100,
    subdivision: 'quarter',
    pattern: null,
    metronomeEnabled: true,
    accentFirst: true,
    soundSubdivisions: true,
  })

  // Keep scheduler in sync with UI state (live, even while playing).
  useEffect(() => { sched.setBpm(bpm) }, [bpm, sched])
  useEffect(() => { sched.setTimeSignature(timeSignature) }, [timeSignature, sched])
  useEffect(() => { sched.setSubdivision(subdivision) }, [subdivision, sched])
  useEffect(() => { sched.setAccentFirst(accentFirst) }, [accentFirst, sched])
  useEffect(() => { sched.setSoundSubdivisions(soundSubdivisions) }, [soundSubdivisions, sched])
  useEffect(() => { sched.setMetronomeVolume(volume) }, [volume, sched])

  useSpacebar(sched.toggle)

  const spb = stepsPerBeat(subdivision)
  const currentBeat = sched.currentStep >= 0 ? Math.floor(sched.currentStep / spb) : -1

  return (
    <div className="page metronome-page">
      <h2>{t('metronomeTitle')}</h2>

      <div className="beat-dots">
        {Array.from({ length: timeSignature.beats }, (_, i) => (
          <span
            key={i}
            className={`beat-dot ${i === currentBeat ? 'active' : ''} ${i === 0 ? 'first' : ''}`}
          />
        ))}
      </div>

      <TransportControls
        bpm={bpm}
        onBpm={setBpm}
        timeSignature={timeSignature}
        onTimeSignature={setTimeSignature}
        subdivision={subdivision}
        onSubdivision={setSubdivision}
        isPlaying={sched.isPlaying}
        onToggle={sched.toggle}
        accentFirst={accentFirst}
        onAccentFirst={setAccentFirst}
        soundSubdivisions={soundSubdivisions}
        onSoundSubdivisions={setSoundSubdivisions}
        showSubdivisionSound
      />

      <div className="volumes-row">
        <div className="volume-control">
          <label>
            <MetronomeIcon /> {t('metronomeVolume')}: <strong>{Math.round(volume * 100)}%</strong>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={volume}
            aria-label={t('metronomeVolume')}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}
