// Lookahead scheduler (Chris Wilson "A Tale of Two Clocks").
// A timer wakes every `lookaheadMs` and schedules any notes due within
// `scheduleAheadSec`, using absolute AudioContext times for jitter-free timing.
import { getAudioContext, getMaster } from './AudioEngine.js'
import { DRUM_VOICES, snareRoll } from './drumSynths.js'
import { click } from './click.js'
import { stepsPerBeat as spbOf, totalSteps as totalStepsOf, INSTRUMENTS, getBars } from '../model/exercise.js'

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
    this._bars = 0 // bars completed since playback started
    this.timeSignature = { beats: 4, unit: 4 }
    this.subdivision = 'quarter'
    this.pattern = null // exercise object, or null for plain metronome
    this.accentFirst = true
    this.metronomeEnabled = true
    this.soundSubdivisions = false // also click on non-beat steps
    this.metronomeVolume = 1 // 0..2 multiplier for click loudness
    this.patternVolume = 1 // 0..2 multiplier for exercise (drum) loudness

    this.isPlaying = false
    this.currentStep = 0
    this.nextNoteTime = 0
    this.timerId = null
    this.lookaheadMs = 25
    this.scheduleAheadSec = 0.1
    this.notesInQueue = [] // {step, time} for visualization
  }

  // Build the per-step layout across all bars: each step's divisor
  // (steps-per-beat of its beat), whether it starts a beat, and whether it
  // starts a bar. Uses the pattern's bars (multi-bar aware) when present,
  // otherwise a single uniform bar (metronome / legacy).
  _recompute() {
    const bars = this.pattern
      ? getBars(this.pattern)
      : [{ ts: this.timeSignature, beatSubs: Array.from({ length: this.timeSignature.beats }, () => this.subdivision) }]
    const divisor = []
    const isBeat = []
    const isBarStart = []
    bars.forEach((bar) => {
      bar.beatSubs.forEach((sub, beatInBar) => {
        const spb = spbOf(sub)
        for (let s = 0; s < spb; s++) {
          divisor.push(spb)
          isBeat.push(s === 0)
          isBarStart.push(s === 0 && beatInBar === 0)
        }
      })
    })
    this._divisor = divisor
    this._isBeat = isBeat
    this._isBarStart = isBarStart
    this._total = divisor.length || 1
  }

  _totalSteps() {
    return this._total || totalStepsOf(this.timeSignature, this.subdivision)
  }

  _secondsPerStepAt(step) {
    const div = (this._divisor && this._divisor[step]) || spbOf(this.subdivision)
    return 60.0 / this.bpm / div
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
    this.currentStep = 0
    this._bars = 0
    this.bpm = this.baseBpm // start each run from the base tempo
    this.nextNoteTime = ctx.currentTime + 0.12
    this.notesInQueue = []
    this._tick()
  }

  stop() {
    this.isPlaying = false
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.notesInQueue = []
    this.currentStep = 0
    this._bars = 0
    this.bpm = this.baseBpm
  }

  _tick = () => {
    const ctx = getAudioContext()
    this._recompute() // cheap; picks up live edits to pattern / subdivision
    while (this.nextNoteTime < ctx.currentTime + this.scheduleAheadSec) {
      this._scheduleStep(this.currentStep, this.nextNoteTime)
      this._advance()
    }
    this.timerId = setTimeout(this._tick, this.lookaheadMs)
  }

  _advance() {
    this.nextNoteTime += this._secondsPerStepAt(this.currentStep)
    const next = (this.currentStep + 1) % this._totalSteps()
    // Count musical bars (each bar-start), not just full-phrase wraps, so the
    // speed/gap trainers step per bar in multi-bar exercises. Step 0 is always a
    // bar start, so single-bar exercises behave exactly as before.
    const startsBar = this._isBarStart ? !!this._isBarStart[next] : next === 0
    if (startsBar) {
      this._bars += 1
      this.bpm = this.rampedBpm()
    }
    this.currentStep = next
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
        const kind = isDownbeat && this.accentFirst ? 'accent' : 'normal'
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
          const gain = (cell.accent ? 1.0 : 0.55) * this.patternVolume
          if (cell.roll && inst === 'snare') {
            snareRoll(ctx, time, this._rollDuration(step), cell.roll, master, gain)
          } else {
            const voice = DRUM_VOICES[inst]
            if (voice) {
              // Flam: a soft grace stroke a hair (~28 ms) before the main hit.
              if (cell.flam) voice(ctx, time - 0.028, master, { gain: gain * 0.5 })
              voice(ctx, time, master, { gain })
            }
          }
        }
      })
    }

    this.notesInQueue.push({ step, time })
  }

  _anyOnset(step) {
    if (!this.pattern) return false
    return INSTRUMENTS.some((inst) => this.pattern.rows[inst]?.[step]?.on)
  }

  // Seconds a roll started at `step` lasts: until the next onset (or end of bar).
  _rollDuration(step) {
    const total = this._totalSteps()
    let dur = this._secondsPerStepAt(step)
    let s = (step + 1) % total
    let guard = 0
    while (guard < total - 1 && !this._anyOnset(s)) {
      dur += this._secondsPerStepAt(s)
      s = (s + 1) % total
      guard++
    }
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
      current = this.notesInQueue.shift().step
    }
    return current
  }
}
