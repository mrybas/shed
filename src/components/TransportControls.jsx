import { useRef } from 'react'
import { useI18n } from '../i18n/I18nContext.jsx'
import SubdivisionPicker from './SubdivisionPicker.jsx'
import ToggleButton from './ToggleButton.jsx'
import { AccentIcon, NoteIcon } from './icons.jsx'

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8']

export default function TransportControls({
  bpm,
  onBpm,
  timeSignature,
  onTimeSignature,
  subdivision,
  onSubdivision,
  isPlaying,
  onToggle,
  accentFirst,
  onAccentFirst,
  soundSubdivisions,
  onSoundSubdivisions,
  showSubdivisionSound = false,
  lockTimeSignature = false,
  lockSubdivision = false,
}) {
  const { t } = useI18n()
  const tapsRef = useRef([])

  const tsValue = `${timeSignature.beats}/${timeSignature.unit}`

  const handleTap = () => {
    const now = performance.now()
    const taps = tapsRef.current
    taps.push(now)
    // keep only recent taps (within 2s gap resets)
    if (taps.length > 1 && now - taps[taps.length - 2] > 2000) {
      tapsRef.current = [now]
      return
    }
    if (taps.length > 5) taps.shift()
    if (taps.length >= 2) {
      const intervals = []
      for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1])
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const newBpm = Math.round(60000 / avg)
      if (newBpm >= 20 && newBpm <= 300) onBpm(newBpm)
    }
  }

  return (
    <div className="transport">
      <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={onToggle}>
        {isPlaying ? '■ ' + t('stop') : '▶ ' + t('play')}
      </button>

      <div className="control bpm-control">
        <label>{t('bpm')}: <strong>{bpm}</strong></label>
        <input
          type="range"
          min="30"
          max="260"
          value={bpm}
          onChange={(e) => onBpm(Number(e.target.value))}
        />
        <input
          type="number"
          min="30"
          max="260"
          value={bpm}
          onChange={(e) => onBpm(Number(e.target.value))}
          className="bpm-number"
        />
        <button className="tap-btn" onClick={handleTap}>{t('tapTempo')}</button>
      </div>

      <div className="control">
        <label>{t('timeSignature')}</label>
        <select
          aria-label={t('timeSignature')}
          value={tsValue}
          disabled={lockTimeSignature}
          onChange={(e) => {
            const [beats, unit] = e.target.value.split('/').map(Number)
            onTimeSignature({ beats, unit })
          }}
        >
          {TIME_SIGNATURES.map((ts) => (
            <option key={ts} value={ts}>{ts}</option>
          ))}
        </select>
      </div>

      <SubdivisionPicker
        value={subdivision}
        onChange={onSubdivision}
        disabled={lockSubdivision}
      />

      {onAccentFirst && (
        <ToggleButton
          active={accentFirst}
          onToggle={onAccentFirst}
          icon={<AccentIcon />}
          title={t('accentFirst')}
        >
          {t('accentFirst')}
        </ToggleButton>
      )}

      {showSubdivisionSound && onSoundSubdivisions && (
        <ToggleButton
          active={soundSubdivisions}
          onToggle={onSoundSubdivisions}
          icon={<NoteIcon type="eighth" />}
          title={t('countSubdivisions')}
        >
          {t('countSubdivisions')}
        </ToggleButton>
      )}
    </div>
  )
}
