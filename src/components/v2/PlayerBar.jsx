import { Icon, NoteGlyph } from '../ui.jsx'
import { parseSig, SUB_MULT } from './util.js'

export function BeatDots({ sig, sub, step, playing, compact, accents, onToggleBeat }) {
  const { num } = parseSig(sig)
  const mult = SUB_MULT[sub] || 1
  const perBar = num * mult
  const local = step >= 0 ? step % perBar : -1
  // Which beats are accented: an explicit pattern, or just the downbeat.
  const isAccented = (b) => (accents && accents.length ? !!accents[b % accents.length] : b === 0)
  const dots = []
  for (let b = 0; b < num; b++) {
    for (let s = 0; s < mult; s++) {
      const idx = b * mult + s
      const isMain = s === 0
      const active = playing && local === idx
      if (compact && !isMain) continue
      const cls = ['beat', isMain ? '' : 'sub', isMain && isAccented(b) ? 'is-down' : '',
        active ? 'is-active' : ''].join(' ')
      if (isMain && onToggleBeat) {
        dots.push(
          <button key={idx} type="button" className={cls + ' beat-btn'}
            aria-label={`beat ${b + 1}`} aria-pressed={isAccented(b)}
            onClick={() => onToggleBeat(b)} />,
        )
      } else {
        dots.push(<span key={idx} className={cls} />)
      }
    }
  }
  return <div className="beats" aria-hidden={onToggleBeat ? undefined : 'true'}>{dots}</div>
}

// Meter-aware dots for exercises: the current bar's beats, each with its own
// subdivision dots (a triplet beat = 3 dots, a 16th beat = 4, a quarter = 1).
function BarBeats({ beatLens = [], stepInBar, playing }) {
  const dots = []
  let off = 0
  beatLens.forEach((len, b) => {
    for (let s = 0; s < len; s++) {
      const isMain = s === 0
      const active = playing && stepInBar === off + s
      dots.push(
        <span key={off + s}
          className={['beat', isMain ? '' : 'sub', b === 0 && isMain ? 'is-down' : '', active ? 'is-active' : ''].join(' ')} />,
      )
    }
    off += len
  })
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

const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

// The "now playing" block: a plain div normally, a button when tapping it
// should reopen the current exercise.
function NowBlock({ as, onOpenItem, t, children }) {
  if (as === 'button') {
    return (
      <button type="button" className="pb-now pb-now-btn" onClick={onOpenItem} title={t('openExercise')}>
        {children}
      </button>
    )
  }
  return <div className="pb-now">{children}</div>
}

export default function PlayerBar({
  t, mode, title, sourceLabel, cat, bpm, setBpm, sig, sub, setSub, showSub,
  soundSubs, onToggleSoundSubs, step, playing, onToggle, gapMuted, countingIn, barView, loopRange,
  workout, onWorkoutSkip, onWorkoutStop, onOpenItem, onClearItem,
}) {
  const bars = barView ? barView.bars : 1
  const curBar = barView ? barView.barIndex + 1 : 0
  return (
    <div className="playerbar">
      {/* Workout strip: its own thin row above the transport, so the workout
          status never fights the title/tempo for space (esp. on phones). */}
      {workout && (
        <div className={'pb-wkrow' + (workout.done ? ' is-done' : '')}>
          {workout.done ? (
            <span className="pb-wk-note">{t('wkDone')}</span>
          ) : (
            <>
              <span className="pb-wk-step num">{t('wkBlock')} {workout.idx}/{workout.total}</span>
              <span className="pb-wktime num">{mmss(workout.secLeft)}</span>
              {workout.resumed && <span className="pb-muted-pill" title={t('wkResumedTitle')}>↗ {workout.resumed}</span>}
              <span className="pb-wk-note">{workout.note}</span>
            </>
          )}
          <span className="pb-wk-spacer" />
          {!workout.done && (
            <button className="pb-wkbtn" onClick={onWorkoutSkip} title={t('wkSkip')} aria-label={t('wkSkip')}>
              <Icon name="chevright" className="ic" />
            </button>
          )}
          <button className="pb-wkbtn" onClick={onWorkoutStop} title={workout.done ? t('wkClose') : t('wkStop')} aria-label={workout.done ? t('wkClose') : t('wkStop')}>
            <Icon name="close" className="ic" />
          </button>
        </div>
      )}
      <div className="pb-inner">
        <button className={'pb-play' + (playing ? ' is-playing' : '')} onClick={onToggle} aria-label={playing ? t('stop') : t('play')}>
          <Icon name={playing ? 'stop' : 'play'} />
        </button>

        {/* Tapping the title returns to the open exercise (mini-player pattern). */}
        <NowBlock as={onOpenItem ? 'button' : 'div'} onOpenItem={onOpenItem} t={t}>
          <div className="pb-title-row">
            <span className="pb-eyebrow">{mode === 'metronome' ? t('metronome') : t('nowPlaying')}</span>
            {countingIn && <span className="pb-muted-pill">{t('countingInTag')}</span>}
            {gapMuted && <span className="pb-muted-pill">{t('gapMutedTag')}</span>}
            {cat && <span className="pb-cat" style={{ background: cat }} />}
          </div>
          <div className="pb-title">{mode === 'metronome' ? `${sig} · ${bpm} ${t('bpm')}` : title}</div>
          {sourceLabel && <div className="pb-source">{sourceLabel}</div>}
        </NowBlock>

        <div className="pb-beats">
          {loopRange && <span className="pb-muted-pill">{t('loopTag')} {loopRange.from + 1}–{loopRange.to + 1}</span>}
          {bars > 1 && <span className="pb-barcount num">{t('bar')} {curBar || 1}/{bars}</span>}
          {barView
            ? <BarBeats beatLens={barView.beatLens} stepInBar={barView.stepInBar} playing={playing} />
            : <BeatDots sig={sig} sub={sub} step={step} playing={playing} />}
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

        {onClearItem && (
          <button className="pb-close" onClick={onClearItem} title={t('closeExercise')} aria-label={t('closeExercise')}>
            <Icon name="close" className="ic" />
          </button>
        )}
      </div>
    </div>
  )
}
