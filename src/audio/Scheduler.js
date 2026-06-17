// Lookahead scheduler (Chris Wilson "A Tale of Two Clocks").
// A timer wakes every `lookaheadMs` and schedules any notes due within
// `scheduleAheadSec`, using absolute AudioContext times for jitter-free timing.
import { getAudioContext, getMaster } from './AudioEngine.js'
import { DRUM_VOICES, ART_VOICE_KEYS, drumRoll } from './drumSynths.js'
import { click } from './click.js'
import { stepsPerBeat as spbOf, totalSteps as totalStepsOf, INSTRUMENTS, getBars } from '../model/exercise.js'

// Shared Worker that posts a message every `ms` — main-thread setTimeout is
// throttled to ~1s in background tabs, which would starve the lookahead loop
// and cause audio dropouts; worker timers keep firing.
let tickerUrl = null
function getTickerUrl() {
  if (!tickerUrl) {
    const src = 'let id=null;onmessage=(e)=>{clearInterval(id);id=null;if(e.data&&e.data.ms)id=setInterval(()=>postMessage(0),e.data.ms)}'
    tickerUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
  }
  return tickerUrl
}

export class Scheduler {
  constructor() {
    this.bpm = 90
    this.baseBpm = 90 // user-set tempo; `bpm` is the live (possibly ramped) value
    // Tempo ramp: every `everyBars` completed bars, raise the tempo by `stepBpm`,
    // optionally capped at `maxBpm` (0 = no cap). Off by default.
    this.tempoRamp = { enabled: false, everyBars: 2, stepBpm: 5, maxBpm: 0 }
    // Gap trainer: play the metronome for `onBars`, then mute it for `offBars`,
    // repeating — so you have to hold the tempo through the silent stretch.
    this.gapTrainer = { enabled: false, onBars: 2, offBars: 2 }
    // Count-in: `bars` of metronome clicks before the exercise. mode 'loop' =
    // count in once then loop; mode 'phrase' = count in before every pass.
    // feel = the click rhythm: 'quarter' (1 2 3 4), 'countoff' (1 2 1-2-3-4),
    // 'eighth' (all 8ths), 'sixteenth' (all 16ths).
    this.countIn = { enabled: false, bars: 1, mode: 'loop', feel: 'quarter' }
    this._countInPlan = [] // [{ dur, accent }] built per run
    // Loop a sub-range of bars: { from, to } inclusive bar indices, or null.
    this.loopRange = null
    // Swing: 0..~0.33 fraction — long/short pairs on eighth/sixteenth grids
    // (0.33 ≈ triplet feel). Tuplet beats are never swung.
    this.swing = 0
    // Subdivision switcher (metronome trainer): rotate through `subs` every
    // `everyBars` bars — forces the inner clock to re-subdivide on the fly.
    this.subSwitcher = { enabled: false, everyBars: 2, subs: ['eighth', 'triplet', 'sixteenth'] }
    // Polyrhythm (metronome trainer): a second click voice playing `against`
    // even strokes per bar (X:Y where X = beats of the meter).
    this.poly = { enabled: false, against: 3 }
    this._nextPolyTime = 0
    this._phase = 'pattern' // 'countin' | 'pattern'
    this._countInStep = 0
    this._countInBeats = 4 // beats per count-in bar (first bar of the pattern)
    this._bars = 0 // bars completed since playback started
    this.timeSignature = { beats: 4, unit: 4 }
    this.subdivision = 'quarter'
    this.pattern = null // exercise object, or null for plain metronome
    this.accentFirst = true
    this.metronomeEnabled = true
    this.soundSubdivisions = false // also click on non-beat steps
    this.accentBeats = null // per-beat accent pattern (array of booleans) or null = downbeat only
    this.metronomeVolume = 1 // 0..2 multiplier for click loudness
    this.patternVolume = 1 // 0..2 multiplier for exercise (drum) loudness
    this.mixer = {} // per-instrument 0..2 multiplier (absent = 1; 0 mutes)

    this.isPlaying = false
    this.currentStep = 0
    this.nextNoteTime = 0
    this.timerId = null
    this.lookaheadMs = 25
    this.scheduleAheadSec = 0.1
    this.notesInQueue = [] // {step, time, sub} for visualization
    this._visualSub = null // subdivision of the step currently being heard

    // In a hidden tab even worker messages can be delivered late — widen the
    // scheduling horizon so the audio stream survives until we're visible again.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.scheduleAheadSec = document.hidden ? 0.5 : 0.1
      })
    }
  }

  // Build the per-step layout across all bars: each step's divisor
  // (steps-per-beat of its beat), whether it starts a beat, and whether it
  // starts a bar. Uses the pattern's bars (multi-bar aware) when present,
  // otherwise a single uniform bar (metronome / legacy).
  // The subdivision the metronome runs right now (switcher-aware).
  currentSubdivision() {
    const sw = this.subSwitcher
    if (!this.pattern && sw?.enabled && sw.subs?.length) {
      // Cycle in order of density (8th → triplet → 16th …) regardless of the
      // order the chips were toggled in, so what's heard matches the picker.
      const order = [...sw.subs].sort((a, b) => spbOf(a) - spbOf(b))
      const idx = Math.floor(this._bars / Math.max(1, sw.everyBars || 1)) % order.length
      return order[idx]
    }
    return this.subdivision
  }

  _recompute() {
    const sub = this.currentSubdivision()
    const bars = this.pattern
      ? getBars(this.pattern)
      : [{ ts: this.timeSignature, beatSubs: Array.from({ length: this.timeSignature.beats }, () => sub) }]
    const divisor = []
    const isBeat = []
    const isBarStart = []
    const posInBeat = []
    const barStartStep = []
    bars.forEach((bar) => {
      barStartStep.push(divisor.length)
      bar.beatSubs.forEach((sub, beatInBar) => {
        const spb = spbOf(sub)
        for (let s = 0; s < spb; s++) {
          divisor.push(spb)
          isBeat.push(s === 0)
          isBarStart.push(s === 0 && beatInBar === 0)
          posInBeat.push(s)
        }
      })
    })
    this._divisor = divisor
    this._isBeat = isBeat
    this._isBarStart = isBarStart
    this._posInBeat = posInBeat
    this._barStartStep = barStartStep
    this._total = divisor.length || 1
    this._countInBeats = bars[0]?.beatSubs.length || this.timeSignature.beats
    // _recompute runs every tick — only rebuild the count-in plan when one of
    // its inputs actually changed.
    const ci = this.countIn || {}
    const ciKey = `${ci.enabled ? 1 : 0}|${ci.bars}|${ci.feel}|${this.bpm}|${this._countInBeats}`
    if (ciKey !== this._countInKey) {
      this._countInKey = ciKey
      this._countInPlan = this._buildCountInPlan()
    }
  }

  // Build the count-in click plan: an array of { dur, accent } per click. The
  // "feel" sets the rhythm; durations use the current (constant) tempo.
  _buildCountInPlan() {
    if (!this.countIn || !this.countIn.enabled || !this.countIn.bars) return []
    const beats0 = this._countInBeats || this.timeSignature.beats
    const beat = 60.0 / this.bpm
    const feel = this.countIn.feel || 'quarter'
    const plan = []
    for (let b = 0; b < this.countIn.bars; b++) {
      if (feel === 'eighth') {
        for (let i = 0; i < beats0 * 2; i++) plan.push({ dur: beat / 2, accent: i === 0 })
      } else if (feel === 'sixteenth') {
        for (let i = 0; i < beats0 * 4; i++) plan.push({ dur: beat / 4, accent: i === 0 })
      } else if (feel === 'countoff') {
        // "1 2 1-2-3-4": first half of the bar in quarters, second half in eighths.
        const half = Math.ceil(beats0 / 2)
        for (let i = 0; i < half; i++) plan.push({ dur: beat, accent: i === 0 })
        for (let i = half; i < beats0; i++) { plan.push({ dur: beat / 2, accent: false }); plan.push({ dur: beat / 2, accent: false }) }
      } else {
        for (let i = 0; i < beats0; i++) plan.push({ dur: beat, accent: i === 0 })
      }
    }
    return plan
  }

  _countInLen() {
    return (this._countInPlan && this._countInPlan.length) || 0
  }

  _totalSteps() {
    return this._total || totalStepsOf(this.timeSignature, this.subdivision)
  }

  _secondsPerStepAt(step) {
    const div = (this._divisor && this._divisor[step]) || spbOf(this.subdivision)
    let dur = 60.0 / this.bpm / div
    // Swing: stretch the on-step and shrink the off-step of each pair on
    // straight eighth/sixteenth grids (triplets etc. keep even spacing).
    if (this.swing > 0 && (div === 2 || div === 4)) {
      const pos = this._posInBeat ? this._posInBeat[step] || 0 : 0
      dur *= pos % 2 === 0 ? 1 + this.swing : 1 - this.swing
    }
    return dur
  }

  // The loop range clamped to the current bar count, or null when inactive.
  _loopClamped() {
    const lr = this.loopRange
    if (!lr || !this._barStartStep || this._barStartStep.length < 2) return null
    const last = this._barStartStep.length - 1
    const from = Math.max(0, Math.min(lr.from ?? 0, last))
    const to = Math.max(from, Math.min(lr.to ?? from, last))
    if (from === 0 && to === last) return null // whole phrase = no loop needed
    return { from, to }
  }

  // The effective tempo given the base tempo and how many bars have elapsed.
  // When stopped or ramp disabled, this is just the base tempo.
  rampedBpm() {
    const r = this.tempoRamp
    if (!r || !r.enabled || !this.isPlaying) return this.baseBpm
    const every = Math.max(1, r.everyBars || 1)
    const intervals = Math.floor(this._bars / every)
    let bpm = this.baseBpm + (r.stepBpm || 0) * intervals
    if (r.maxBpm && r.maxBpm > 0) bpm = Math.min(bpm, r.maxBpm)
    return Math.max(20, Math.min(400, bpm))
  }

  // Whether the metronome is currently silenced by the gap trainer. The exercise
  // drums still play; only the click (beats + subdivisions) is muted.
  metronomeMuted() {
    const g = this.gapTrainer
    if (!g || !g.enabled || !this.isPlaying) return false
    const on = Math.max(0, g.onBars || 0)
    const off = Math.max(0, g.offBars || 0)
    const cycle = on + off
    if (cycle <= 0 || off <= 0) return false
    return this._bars % cycle >= on
  }

  start() {
    if (this.isPlaying) return
    const ctx = getAudioContext()
    this._recompute()
    this.isPlaying = true
    // Start inside the looped range when one is set.
    const lr = this._loopClamped()
    this.currentStep = lr ? this._barStartStep[lr.from] : 0
    this._resumeStep = this.currentStep
    this._bars = 0
    this.bpm = this.baseBpm // start each run from the base tempo
    this._countInStep = 0
    this._phase = this._countInLen() > 0 ? 'countin' : 'pattern'
    this.nextNoteTime = ctx.currentTime + 0.12
    this._nextPolyTime = this.nextNoteTime // poly voice locks to the downbeat
    this.notesInQueue = []
    this._visualSub = null
    this._startTicker()
  }

  stop() {
    this.isPlaying = false
    this._stopTicker()
    this.notesInQueue = []
    this._visualSub = null
    this.currentStep = 0
    this._bars = 0
    this.bpm = this.baseBpm
    this._phase = 'pattern'
    this._countInStep = 0
    this._resumeStep = 0
  }

  // Drive _tick from a Worker interval when possible (background-tab safe);
  // fall back to a setTimeout chain (jsdom / very old browsers).
  _startTicker() {
    if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        if (!this._worker) {
          this._worker = new Worker(getTickerUrl())
          this._worker.onmessage = this._tick
        }
        this._worker.postMessage({ ms: this.lookaheadMs })
        this._usingWorker = true
        this._tick() // schedule the first window immediately
        return
      } catch { /* fall back below */ }
    }
    this._usingWorker = false
    this._tick()
  }

  _stopTicker() {
    if (this._worker) {
      try { this._worker.postMessage({ ms: 0 }) } catch { /* ignore */ }
    }
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  _tick = () => {
    if (!this.isPlaying) return
    const ctx = getAudioContext()
    this._recompute() // cheap; picks up live edits to pattern / subdivision
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadSec) {
      if (this._phase === 'countin') {
        this._scheduleCountIn(this._countInStep, this.nextNoteTime)
        this._advanceCountIn()
      } else {
        this._scheduleStep(this.currentStep, this.nextNoteTime)
        this._advance()
      }
    }
    // Second click voice for polyrhythms: `against` even strokes per bar.
    if (!this.pattern && this.poly?.enabled && this._phase !== 'countin') {
      const master = getMaster()
      const polyStep = (this.timeSignature.beats * (60.0 / this.bpm)) / Math.max(2, this.poly.against || 3)
      while (this._nextPolyTime < ctx.currentTime + this.scheduleAheadSec) {
        click(ctx, this._nextPolyTime, master, 'poly', this.metronomeVolume)
        this._nextPolyTime += polyStep
      }
    }
    if (!this._usingWorker) this.timerId = setTimeout(this._tick, this.lookaheadMs)
  }

  // A count-in click (one per beat); accents the first beat of each count-in bar.
  // Pushes step -1 so the visual playhead stays idle during the count-in.
  _scheduleCountIn(i, time) {
    const ctx = getAudioContext()
    const master = getMaster()
    const slot = this._countInPlan[i]
    const kind = slot && slot.accent && this.accentFirst ? 'accent' : 'normal'
    click(ctx, time, master, kind, this.metronomeVolume)
    this.notesInQueue.push({ step: -1, time })
  }

  _advanceCountIn() {
    const slot = this._countInPlan[this._countInStep]
    this.nextNoteTime += (slot && slot.dur) || (60.0 / this.bpm)
    this._countInStep += 1
    if (this._countInStep >= this._countInLen()) {
      this._phase = 'pattern'
      this.currentStep = this._resumeStep || 0
    }
  }

  _advance() {
    this.nextNoteTime += this._secondsPerStepAt(this.currentStep)
    let next = this.currentStep + 1
    let wrapped = false
    const lr = this._loopClamped()
    if (lr) {
      // Loop a bar range: wrap (or pull a stray playhead) back to the range start.
      const s0 = this._barStartStep[lr.from]
      const s1 = lr.to + 1 < this._barStartStep.length ? this._barStartStep[lr.to + 1] : this._totalSteps()
      if (next >= s1 || next >= this._totalSteps() || next < s0) { next = s0; wrapped = true }
    } else if (next >= this._totalSteps()) {
      next = 0
      wrapped = true
    }
    // Count musical bars (each bar-start), not just full-phrase wraps, so the
    // speed/gap trainers step per bar in multi-bar exercises. Step 0 is always a
    // bar start, so single-bar exercises behave exactly as before.
    const startsBar = this._isBarStart ? !!this._isBarStart[next] : next === 0
    if (startsBar) {
      this._bars += 1
      this.bpm = this.rampedBpm()
      // The switcher may re-subdivide the next bar — rebuild the layout now so
      // the steps scheduled in this very tick already use the new grid.
      if (!this.pattern && this.subSwitcher?.enabled) this._recompute()
    }
    // "Count-in each pass" mode: at the end of a pass (full phrase, or the
    // looped range), count in again before replaying.
    if (wrapped && this.countIn && this.countIn.enabled && this.countIn.mode === 'phrase' && this._countInLen() > 0) {
      this._phase = 'countin'
      this._countInStep = 0
      this._resumeStep = next
      this.currentStep = next
      return
    }
    this.currentStep = next
  }

  // Whether playback is currently in the count-in lead-in.
  inCountIn() {
    return this.isPlaying && this._phase === 'countin'
  }

  _scheduleStep(step, time) {
    const ctx = getAudioContext()
    const master = getMaster()
    const isBeat = this._isBeat ? !!this._isBeat[step] : (step % spbOf(this.subdivision) === 0)
    const isDownbeat = this._isBarStart ? !!this._isBarStart[step] : step === 0

    // Metronome click. Beat clicks need the metronome enabled; subdivision
    // clicks are independent (so "sound subdivisions" works even with the beat
    // metronome off — e.g. while practising an exercise). The gap trainer mutes
    // all clicks during its silent bars.
    const muted = this.metronomeMuted()
    if (isBeat) {
      if (this.metronomeEnabled && !muted) {
        let kind = 'normal'
        if (this.accentBeats && this.accentBeats.length) {
          kind = this.accentBeats[this._beatIndexInBar(step) % this.accentBeats.length] ? 'accent' : 'normal'
        } else if (isDownbeat && this.accentFirst) {
          kind = 'accent'
        }
        click(ctx, time, master, kind, this.metronomeVolume)
      }
    } else if (this.soundSubdivisions && !muted) {
      click(ctx, time, master, 'soft', this.metronomeVolume)
    }

    // Exercise pattern
    if (this.pattern) {
      INSTRUMENTS.forEach((inst) => {
        const cell = this.pattern.rows[inst]?.[step]
        if (cell && cell.on) {
          const mix = this.mixer[inst] ?? 1
          if (mix <= 0) return // muted in the mixer
          // Three dynamic levels: ghost (quiet) < normal < accent.
          const gain = (cell.ghost ? 0.22 : cell.accent ? 1.0 : 0.55) * this.patternVolume * mix
          // Articulations (cross-stick, rimshot, bell) swap in their own voice.
          const artKey = cell.art ? ART_VOICE_KEYS[`${inst}:${cell.art}`] : null
          const voice = DRUM_VOICES[artKey || inst]
          if (cell.roll && voice) {
            // Open rolls are metered 32nd-note doubles: 8 strokes per quarter.
            const strokesPerSec = (this.bpm / 60) * 8
            drumRoll(ctx, time, this._rollDuration(step, !!cell.tie), cell.roll, master, gain, voice, strokesPerSec)
          } else if (voice) {
            // Flam: one soft grace stroke ~28ms early; drag (ruff): two graces
            // ~52/26ms early — clamped so they can't land in the past.
            if (cell.flam === 'drag') {
              voice(ctx, Math.max(time - 0.052, ctx.currentTime + 0.005), master, { gain: gain * 0.45 })
              voice(ctx, Math.max(time - 0.026, ctx.currentTime + 0.01), master, { gain: gain * 0.45 })
            } else if (cell.flam) {
              voice(ctx, Math.max(time - 0.028, ctx.currentTime + 0.005), master, { gain: gain * 0.5 })
            }
            voice(ctx, time, master, { gain })
          }
        }
      })
    }

    // Tag each visual note with the subdivision it belongs to, so the playhead
    // and the beat-dot layout flip together at the *heard* boundary (not ~one
    // lookahead window early, which read as jitter on the switch).
    this.notesInQueue.push({ step, time, sub: this.currentSubdivision() })
  }

  // Zero-based beat number within the bar that contains `step`.
  _beatIndexInBar(step) {
    const beatAt = (i) => (this._isBeat ? !!this._isBeat[i] : i % spbOf(this.subdivision) === 0)
    const barStartAt = (i) => (this._isBarStart ? !!this._isBarStart[i] : i === 0)
    let start = step
    while (start > 0 && !barStartAt(start)) start--
    let idx = 0
    for (let i = start + 1; i <= step; i++) if (beatAt(i)) idx++
    return idx
  }

  _anyOnset(step) {
    if (!this.pattern) return false
    return INSTRUMENTS.some((inst) => this.pattern.rows[inst]?.[step]?.on)
  }

  // Seconds a roll started at `step` lasts: until the next onset (or end of bar).
  // A roll that runs into a barline behaves per its tie: tied rolls buzz
  // seamlessly into the next bar's downbeat; untied ones release just before
  // the barline (a breath, then the downbeat is a fresh stroke).
  _rollDuration(step, tied = false) {
    const total = this._totalSteps()
    let dur = this._secondsPerStepAt(step)
    let s = (step + 1) % total
    let guard = 0
    while (guard < total - 1 && !this._anyOnset(s)) {
      dur += this._secondsPerStepAt(s)
      s = (s + 1) % total
      guard++
    }
    // Internal barlines only — the loop seam (s === 0) stays seamless so
    // existing one-bar roll exercises keep their sound.
    const endsAtBarline = s !== 0 && (this._isBarStart ? !!this._isBarStart[s] : false)
    // The release breath scales with tempo: an eighth note, capped at half
    // the roll so very short rolls still speak.
    if (!tied && endsAtBarline) dur -= Math.min(dur * 0.5, 30 / this.bpm)
    return dur
  }

  // Returns the step that should be highlighted right now, or -1.
  // Compensates for output latency: a note scheduled at audio-time T is actually
  // heard ~outputLatency later, so we delay the highlight to match the sound.
  visualStep() {
    const ctx = getAudioContext()
    const latency = (ctx.baseLatency || 0) + (ctx.outputLatency || 0)
    const now = ctx.currentTime - latency
    let current = -1
    while (this.notesInQueue.length && this.notesInQueue[0].time <= now) {
      const n = this.notesInQueue.shift()
      current = n.step
      if (n.step >= 0 && n.sub) this._visualSub = n.sub
    }
    return current
  }

  // The subdivision of the step being heard right now (latency-compensated, in
  // sync with visualStep()). Used to lay out the beat dots so they switch with
  // the playhead rather than ~one lookahead window ahead of it.
  visualSub() {
    return this._visualSub || this.subdivision
  }
}
