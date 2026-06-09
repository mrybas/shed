import { Icon, NoteGlyph } from '../ui.jsx'
import { parseSig, SUB_MULT } from './util.js'

export function BeatDots({ sig, sub, step, playing, compact }) {
  const { num } = parseSig(sig)
  const mult = SUB_MULT[sub] || 1
  const perBar = num * mult
  const local = step >= 0 ? step % perBar : -1
  const dots = []
  for (let b = 0; b < num; b++) {
    for (let s = 0; s < mult; s++) {
      const idx = b * mult + s
      const isMain = s === 0
      const active = playing && local === idx
      if (compact && !isMain) continue
      dots.push(
        <span
          key={idx}
          className={['beat', isMain ? '' : 'sub', b === 0 && isMain ? 'is-down' : '',
            active ? 'is-active' : '', active && b === 0 && isMain ? 'is-down' : ''].join(' ')}
        />,
      )
    }
  }
  return <div className="beats" aria-hidden="true">{dots}</div>
}

function CompactSub({ value, onChange }) {
  const opts = ['quarter', 'eighth', 'triplet', 'sixteenth']
  return (
    <div className="pb-sub" role="group" aria-label="Subdivision">
      {opts.map((k) => (
        <button key={k} className={'pb-sub-btn' + (value === k ? ' is-active' : '')} onClick={() => onChange(k)} aria-label={k}>
          <NoteGlyph kind={k} />
        </button>
      ))}
    </div>
  )
}

export default function PlayerBar({
  t, mode, title, sourceLabel, cat, bpm, setBpm, sig, sub, setSub, showSub,
  soundSubs, onToggleSoundSubs, bars = 1, step, playing, onToggle, gapMuted,
}) {
  const perBar = parseSig(sig).num * (SUB_MULT[sub] || 1)
  const curBar = bars > 1 && step >= 0 ? Math.floor(step / perBar) + 1 : 0
  return (
    <div className="playerbar">
      <div className="pb-inner">
        <button className={'pb-play' + (playing ? ' is-playing' : '')} onClick={onToggle} aria-label={playing ? t('stop') : t('play')}>
          <Icon name={playing ? 'stop' : 'play'} />
        </button>

        <div className="pb-now">
          <div className="pb-title-row">
            <span className="pb-eyebrow">{mode === 'metronome' ? t('metronome') : t('nowPlaying')}</span>
            {gapMuted && <span className="pb-muted-pill">{t('gapMutedTag')}</span>}
            {cat && <span className="pb-cat" style={{ background: cat }} />}
          </div>
          <div className="pb-title">{mode === 'metronome' ? `${sig} · ${bpm} ${t('bpm')}` : title}</div>
          {sourceLabel && <div className="pb-source">{sourceLabel}</div>}
        </div>

        <div className="pb-beats">
          {bars > 1 && <span className="pb-barcount num">{t('bar')} {curBar || 1}/{bars}</span>}
          <BeatDots sig={sig} sub={sub} step={step} playing={playing} />
        </div>

        {showSub && <CompactSub value={sub} onChange={setSub} />}

        {onToggleSoundSubs && (
          <button
            className={'pb-subtoggle' + (soundSubs ? ' is-active' : '')}
            onClick={() => onToggleSoundSubs(!soundSubs)}
            aria-pressed={!!soundSubs}
            title={t('countSubdivisions')}
            aria-label={t('countSubdivisions')}
          >
            <NoteGlyph kind="eighth" />
          </button>
        )}

        <div className="pb-tempo">
          <button className="pb-step" aria-label="-5 BPM" onClick={() => setBpm(Math.max(30, bpm - 5))}>−</button>
          <div className="pb-bpm">
            <span className="pb-bpm-val num">{bpm}</span>
            <span className="pb-bpm-unit">{t('bpm')}</span>
          </div>
          <button className="pb-step" aria-label="+5 BPM" onClick={() => setBpm(Math.min(260, bpm + 5))}>+</button>
        </div>
      </div>
    </div>
  )
}
