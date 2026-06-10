import { describe, it, expect, vi, beforeEach } from 'vitest'

// Fake AudioContext with a controllable clock.
const fakeCtx = { currentTime: 0 }
vi.mock('./AudioEngine.js', () => ({
  getAudioContext: () => fakeCtx,
  getMaster: () => ({ id: 'master' }),
}))
vi.mock('./drumSynths.js', () => ({
  DRUM_VOICES: {
    kick: vi.fn(),
    snare: vi.fn(),
    hihatClosed: vi.fn(),
    hihatOpen: vi.fn(),
    ride: vi.fn(),
    crash: vi.fn(),
    tom1: vi.fn(),
    tom2: vi.fn(),
    floorTom: vi.fn(),
  },
  drumRoll: vi.fn(),
  snareRoll: vi.fn(),
}))
vi.mock('./click.js', () => ({ click: vi.fn() }))

import { Scheduler } from './Scheduler.js'
import { DRUM_VOICES, drumRoll } from './drumSynths.js'
import { click } from './click.js'
import { createEmptyExercise, addBar } from '../model/exercise.js'

describe('Scheduler timing math', () => {
  it('computes seconds per step from bpm and subdivision', () => {
    const s = new Scheduler()
    s.bpm = 120
    s.subdivision = 'quarter'
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.5)
    s.subdivision = 'eighth'
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.25)
    s.subdivision = 'sixteenth'
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.125)
    s.subdivision = 'triplet'
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.5 / 3)
  })

  it('computes total steps from time signature and subdivision', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 4, unit: 4 }
    s.subdivision = 'sixteenth'
    expect(s._totalSteps()).toBe(16)
    s.timeSignature = { beats: 6, unit: 8 }
    s.subdivision = 'eighth'
    expect(s._totalSteps()).toBe(12)
  })

  it('uses per-beat subdivisions from the pattern', () => {
    const s = new Scheduler()
    s.bpm = 60 // 1s per beat
    s.timeSignature = { beats: 3, unit: 4 }
    s.pattern = createEmptyExercise({ timeSignature: { beats: 3, unit: 4 }, beatSubs: ['sixteenth', 'triplet', 'quarter'] })
    s._recompute()
    expect(s._totalSteps()).toBe(8) // 4 + 3 + 1
    expect(s._isBeat).toEqual([true, false, false, false, true, false, false, true])
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.25) // sixteenth
    expect(s._secondsPerStepAt(4)).toBeCloseTo(1 / 3) // triplet
    expect(s._secondsPerStepAt(7)).toBeCloseTo(1) // quarter
  })

  it('ramps the tempo every N bars by the configured step, capped at maxBpm', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 1, unit: 4 }
    s.subdivision = 'quarter' // 1 step per bar -> each advance is a bar boundary
    s.baseBpm = 100
    s.tempoRamp = { enabled: true, everyBars: 2, stepBpm: 10, maxBpm: 125 }
    s.isPlaying = true
    s.bpm = s.baseBpm
    s._bars = 0
    const bpmAfterBars = (n) => { for (let i = 0; i < n; i++) s._advance(); return s.bpm }
    expect(bpmAfterBars(1)).toBe(100) // 1 bar done, < everyBars
    expect(bpmAfterBars(1)).toBe(110) // 2 bars done -> +10
    expect(bpmAfterBars(2)).toBe(120) // 4 bars done -> +20
    expect(bpmAfterBars(2)).toBe(125) // 6 bars -> +30 capped at 125
  })

  it('gap trainer mutes the metronome during the off bars only', () => {
    const s = new Scheduler()
    s.isPlaying = true
    s.gapTrainer = { enabled: true, onBars: 2, offBars: 2 } // cycle of 4
    const muteAt = (bar) => { s._bars = bar; return s.metronomeMuted() }
    expect([0, 1].map(muteAt)).toEqual([false, false]) // on bars
    expect([2, 3].map(muteAt)).toEqual([true, true]) // off bars
    expect([4, 5, 6, 7].map(muteAt)).toEqual([false, false, true, true]) // repeats
  })

  it('gap trainer never mutes when stopped, disabled, or offBars is 0', () => {
    const s = new Scheduler()
    s.gapTrainer = { enabled: true, onBars: 1, offBars: 1 }
    s._bars = 1
    s.isPlaying = false
    expect(s.metronomeMuted()).toBe(false) // stopped
    s.isPlaying = true
    s.gapTrainer.enabled = false
    expect(s.metronomeMuted()).toBe(false) // disabled
    s.gapTrainer = { enabled: true, onBars: 2, offBars: 0 }
    s._bars = 5
    expect(s.metronomeMuted()).toBe(false) // never off
  })

  it('suppresses the click during a muted gap bar but keeps the drum voices', () => {
    const s = new Scheduler()
    s.isPlaying = true
    s.subdivision = 'quarter'
    s.metronomeEnabled = true
    s.gapTrainer = { enabled: true, onBars: 1, offBars: 1 }
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false }
    s.pattern = ex
    s._recompute()
    s._bars = 1 // an "off" bar
    s._scheduleStep(0, 1.0)
    expect(click).not.toHaveBeenCalled() // metronome muted
    expect(DRUM_VOICES.snare).toHaveBeenCalled() // drums still play
  })

  it('rampedBpm returns the base tempo when stopped or ramp disabled', () => {
    const s = new Scheduler()
    s.baseBpm = 90
    s.tempoRamp = { enabled: true, everyBars: 1, stepBpm: 5, maxBpm: 0 }
    s.isPlaying = false
    s._bars = 10
    expect(s.rampedBpm()).toBe(90) // stopped
    s.isPlaying = true
    s.tempoRamp.enabled = false
    expect(s.rampedBpm()).toBe(90) // disabled
  })

  it('resets the bar count and tempo to base on start and stop', () => {
    const s = new Scheduler()
    s.baseBpm = 100
    s.tempoRamp = { enabled: true, everyBars: 1, stepBpm: 10, maxBpm: 0 }
    s.start()
    s._bars = 3
    s.bpm = 130
    s.stop()
    expect(s._bars).toBe(0)
    expect(s.bpm).toBe(100)
  })

  it('builds a per-bar layout (divisor / isBeat / isBarStart) across all bars', () => {
    const s = new Scheduler()
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'eighth' }) // 4 steps/bar
    ex = addBar(ex) // 2 bars, 8 steps
    s.pattern = ex
    s._recompute()
    expect(s._total).toBe(8)
    expect(s._isBeat).toEqual([true, false, true, false, true, false, true, false])
    expect(s._isBarStart).toEqual([true, false, false, false, true, false, false, false])
  })

  it('counts a musical bar at each bar-start on advance', () => {
    const s = new Scheduler()
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' }) // 2 steps/bar
    ex = addBar(ex) // 2 bars, 4 steps
    s.pattern = ex
    s.baseBpm = 100
    s._recompute()
    s.currentStep = 0
    s._bars = 0
    s.isPlaying = true
    for (let i = 0; i < 2; i++) s._advance() // step 0 -> 1 -> 2 (start of bar 2)
    expect(s._bars).toBe(1) // one bar boundary crossed
    for (let i = 0; i < 2; i++) s._advance() // -> 3 -> 0 (phrase wrap = bar start)
    expect(s._bars).toBe(2)
  })

  it('count-in plays N bars of clicks before the pattern, then enters the pattern', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.timeSignature = { beats: 4, unit: 4 }
    s.pattern = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'quarter' })
    s.countIn = { enabled: true, bars: 1, mode: 'loop' }
    s._recompute()
    expect(s._countInLen()).toBe(4) // 1 bar × 4 beats
    s.start()
    expect(s._phase).toBe('countin')
    // advance through the 4 count-in clicks
    for (let i = 0; i < 4; i++) s._advanceCountIn()
    expect(s._phase).toBe('pattern')
    expect(s.currentStep).toBe(0)
  })

  it('count-in feel sets the click plan (quarter / eighth / sixteenth / countoff)', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 4, unit: 4 }
    s.pattern = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'quarter' })
    s.bpm = 120 // beat = 0.5s
    const lenFor = (feel) => { s.countIn = { enabled: true, bars: 1, mode: 'loop', feel }; s._recompute(); return s._countInLen() }
    expect(lenFor('quarter')).toBe(4)
    expect(lenFor('eighth')).toBe(8)
    expect(lenFor('sixteenth')).toBe(16)
    expect(lenFor('countoff')).toBe(6) // "1 2 1-2-3-4" = 2 quarters + 4 eighths
    // countoff plan: first two are quarters (0.5s), last four eighths (0.25s)
    const plan = s._countInPlan
    expect(plan[0]).toEqual({ dur: 0.5, accent: true })
    expect(plan[2].dur).toBeCloseTo(0.25)
  })

  it('count-in "phrase" mode re-enters count-in after each full pass', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.timeSignature = { beats: 2, unit: 4 } // 2 steps
    s.pattern = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    s.countIn = { enabled: true, bars: 1, mode: 'phrase' }
    s._recompute()
    s._phase = 'pattern'
    s.currentStep = 0
    s.isPlaying = true
    s._advance() // step 0 -> 1
    expect(s._phase).toBe('pattern')
    s._advance() // step 1 -> wrap; phrase mode -> back to count-in
    expect(s._phase).toBe('countin')
    expect(s._countInStep).toBe(0)
  })

  it('count-in "loop" mode keeps looping the pattern without re-counting', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.timeSignature = { beats: 2, unit: 4 }
    s.pattern = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    s.countIn = { enabled: true, bars: 1, mode: 'loop' }
    s._recompute()
    s._phase = 'pattern'
    s.currentStep = 1
    s.isPlaying = true
    s._advance() // wrap; loop mode -> stay in pattern
    expect(s._phase).toBe('pattern')
    expect(s.currentStep).toBe(0)
  })

  it('loopRange keeps the playhead inside the selected bars', () => {
    const s = new Scheduler()
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' }) // 2 steps/bar
    ex = addBar(ex); ex = addBar(ex); ex = addBar(ex) // 4 bars, steps 0..7
    s.pattern = ex
    s.loopRange = { from: 1, to: 2 } // steps 2..5
    s._recompute()
    s.isPlaying = true
    s.currentStep = 2
    const seen = []
    for (let i = 0; i < 6; i++) { s._advance(); seen.push(s.currentStep) }
    expect(seen).toEqual([3, 4, 5, 2, 3, 4]) // wraps 5 -> 2, never leaves 2..5
  })

  it('loopRange covering the whole phrase behaves like no loop', () => {
    const s = new Scheduler()
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    ex = addBar(ex)
    s.pattern = ex
    s.loopRange = { from: 0, to: 1 }
    s._recompute()
    expect(s._loopClamped()).toBeNull()
  })

  it('swing lengthens on-steps and shortens off-steps on straight grids only', () => {
    const s = new Scheduler()
    s.bpm = 60 // beat = 1s
    s.timeSignature = { beats: 2, unit: 4 }
    s.pattern = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, beatSubs: ['eighth', 'triplet'] })
    s._recompute()
    s.swing = 1 / 3 // full triplet feel
    // eighth beat: pair 0.5s±1/3 -> 0.666 / 0.333
    expect(s._secondsPerStepAt(0)).toBeCloseTo(0.5 * (4 / 3))
    expect(s._secondsPerStepAt(1)).toBeCloseTo(0.5 * (2 / 3))
    // triplet beat unswung: 1/3s each
    expect(s._secondsPerStepAt(2)).toBeCloseTo(1 / 3)
    expect(s._secondsPerStepAt(3)).toBeCloseTo(1 / 3)
  })

  it('wraps currentStep at the bar boundary on advance', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 4, unit: 4 }
    s.subdivision = 'quarter' // 4 steps
    s.currentStep = 3
    s.nextNoteTime = 0
    s._advance()
    expect(s.currentStep).toBe(0)
  })
})

describe('Scheduler step scheduling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeCtx.currentTime = 0
  })

  it('clicks an accent on the downbeat and plays active voices', () => {
    const s = new Scheduler()
    s.bpm = 120
    s.timeSignature = { beats: 4, unit: 4 }
    s.subdivision = 'sixteenth'
    s.metronomeEnabled = true
    s.accentFirst = true

    const ex = createEmptyExercise({ subdivision: 'sixteenth' })
    ex.rows.snare[0] = { on: true, accent: true }
    ex.rows.kick[0] = { on: true, accent: false }
    s.pattern = ex

    s._scheduleStep(0, 1.0)

    expect(click).toHaveBeenCalledWith(expect.anything(), 1.0, expect.anything(), 'accent', 1)
    expect(DRUM_VOICES.snare).toHaveBeenCalledWith(fakeCtx, 1.0, expect.anything(), { gain: 1.0 })
    expect(DRUM_VOICES.kick).toHaveBeenCalledWith(fakeCtx, 1.0, expect.anything(), { gain: 0.55 })
    expect(s.notesInQueue).toEqual([{ step: 0, time: 1.0 }])
  })

  it('plays a snare roll spanning until the next onset', () => {
    const s = new Scheduler()
    s.bpm = 60
    s.timeSignature = { beats: 2, unit: 4 }
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 'open' }
    s.pattern = ex
    s._recompute()
    s._scheduleStep(0, 5.0)
    // step 1 is empty -> roll runs to the end of the bar (2 beats = 2s at 60 BPM)
    expect(drumRoll).toHaveBeenCalledWith(fakeCtx, 5.0, 2, 'open', expect.anything(), expect.any(Number), DRUM_VOICES.snare)
    expect(DRUM_VOICES.snare).not.toHaveBeenCalled()
  })

  it('plays a roll on any instrument with that instrument\'s voice', () => {
    const s = new Scheduler()
    s.bpm = 60
    s.timeSignature = { beats: 2, unit: 4 }
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    ex.rows.tom1[0] = { on: true, accent: false, roll: 'closed' }
    s.pattern = ex
    s._recompute()
    s._scheduleStep(0, 3.0)
    expect(drumRoll).toHaveBeenCalledWith(fakeCtx, 3.0, 2, 'closed', expect.anything(), expect.any(Number), DRUM_VOICES.tom1)
    expect(DRUM_VOICES.tom1).not.toHaveBeenCalled()
  })

  it('flam schedules a soft grace stroke just before the main hit', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, flam: true }
    s.pattern = ex
    s._scheduleStep(0, 5.0)
    // main hit at 5.0 plus a quieter grace a touch earlier
    expect(DRUM_VOICES.snare).toHaveBeenCalledTimes(2)
    const calls = DRUM_VOICES.snare.mock.calls
    const times = calls.map((c) => c[1]).sort((a, b) => a - b)
    expect(times[1]).toBe(5.0)
    expect(times[0]).toBeLessThan(5.0)
    const graceGain = calls.find((c) => c[1] < 5.0)[3].gain
    const mainGain = calls.find((c) => c[1] === 5.0)[3].gain
    expect(graceGain).toBeLessThan(mainGain)
  })

  it('drag schedules two grace strokes before the main hit', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, flam: 'drag' }
    s.pattern = ex
    s._scheduleStep(0, 5.0)
    expect(DRUM_VOICES.snare).toHaveBeenCalledTimes(3) // 2 graces + main
    const times = DRUM_VOICES.snare.mock.calls.map((c) => c[1]).sort((a, b) => a - b)
    expect(times[2]).toBe(5.0)
    expect(times[0]).toBeLessThan(times[1])
    expect(times[1]).toBeLessThan(5.0)
  })

  it('ghost notes play quieter than normal hits', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, ghost: true }
    ex.rows.snare[1] = { on: true, accent: false, roll: 0 }
    s.pattern = ex
    s._scheduleStep(0, 1.0)
    s._scheduleStep(1, 1.5)
    const gains = DRUM_VOICES.snare.mock.calls.map((c) => c[3].gain)
    expect(gains[0]).toBeCloseTo(0.22)
    expect(gains[1]).toBeCloseTo(0.55)
  })

  it('scales drum gain by patternVolume', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    s.patternVolume = 0.5
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: true }
    ex.rows.kick[0] = { on: true, accent: false }
    s.pattern = ex
    s._scheduleStep(0, 2.0)
    expect(DRUM_VOICES.snare).toHaveBeenCalledWith(fakeCtx, 2.0, expect.anything(), { gain: 0.5 })
    expect(DRUM_VOICES.kick).toHaveBeenCalledWith(fakeCtx, 2.0, expect.anything(), { gain: 0.275 })
  })

  it('accents the downbeat of every bar (not just the first bar)', () => {
    const s = new Scheduler()
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' }) // 2 steps/bar
    ex = addBar(ex) // 2 bars, steps: 0=bar0 b1, 1=bar0 b2, 2=bar1 b1, 3=bar1 b2
    s.pattern = ex
    s.metronomeEnabled = true
    s.accentFirst = true
    s._recompute()

    s._scheduleStep(2, 9.0) // start of bar 2 -> accent
    expect(click).toHaveBeenCalledWith(expect.anything(), 9.0, expect.anything(), 'accent', 1)
    click.mockClear()
    s._scheduleStep(3, 9.5) // bar 2 beat 2 -> normal
    expect(click).toHaveBeenCalledWith(expect.anything(), 9.5, expect.anything(), 'normal', 1)
  })

  it('clicks a normal beat (not accent) on later beats, no subdivision click by default', () => {
    const s = new Scheduler()
    s.subdivision = 'sixteenth'
    s.metronomeEnabled = true
    s.accentFirst = true

    s._scheduleStep(4, 2.0) // step 4 = beat 2 (sixteenth -> 4 per beat)
    expect(click).toHaveBeenCalledWith(expect.anything(), 2.0, expect.anything(), 'normal', 1)

    click.mockClear()
    s._scheduleStep(1, 2.1) // off-beat subdivision, soundSubdivisions=false
    expect(click).not.toHaveBeenCalled()
  })

  it('clicks soft on subdivisions when enabled', () => {
    const s = new Scheduler()
    s.subdivision = 'sixteenth'
    s.metronomeEnabled = true
    s.soundSubdivisions = true
    s._scheduleStep(1, 3.0)
    expect(click).toHaveBeenCalledWith(expect.anything(), 3.0, expect.anything(), 'soft', 1)
  })

  it('passes the metronome volume multiplier to the click', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = true
    s.metronomeVolume = 0.5
    s._scheduleStep(0, 0.0)
    expect(click).toHaveBeenCalledWith(expect.anything(), 0.0, expect.anything(), 'accent', 0.5)
  })

  it('does not click when metronome disabled', () => {
    const s = new Scheduler()
    s.metronomeEnabled = false
    s._scheduleStep(0, 0.5)
    expect(click).not.toHaveBeenCalled()
  })
})

describe('Scheduler visualStep', () => {
  beforeEach(() => { fakeCtx.currentTime = 0 })

  it('returns the latest step whose time has passed and dequeues it', () => {
    const s = new Scheduler()
    s.notesInQueue = [
      { step: 0, time: 1.0 },
      { step: 1, time: 1.5 },
      { step: 2, time: 2.0 },
    ]
    fakeCtx.currentTime = 0.5
    expect(s.visualStep()).toBe(-1) // nothing due yet
    fakeCtx.currentTime = 1.6
    expect(s.visualStep()).toBe(1) // steps 0 and 1 are due; latest is 1
    expect(s.notesInQueue).toHaveLength(1)
    fakeCtx.currentTime = 2.0
    expect(s.visualStep()).toBe(2)
    expect(s.notesInQueue).toHaveLength(0)
  })
})

describe('metronome trainers', () => {
  it('subdivision switcher rotates the grid every N bars', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 2, unit: 4 }
    s.subdivision = 'quarter'
    s.subSwitcher = { enabled: true, everyBars: 2, subs: ['quarter', 'sixteenth', 'triplet'] }
    s._bars = 0
    expect(s.currentSubdivision()).toBe('quarter')
    s._bars = 2
    expect(s.currentSubdivision()).toBe('sixteenth')
    s._bars = 4
    expect(s.currentSubdivision()).toBe('triplet')
    s._bars = 6
    expect(s.currentSubdivision()).toBe('quarter') // wraps
    s._recompute()
    expect(s._total).toBe(2) // quarter grid again
    // exercises never switch
    s.pattern = createEmptyExercise({ subdivision: 'eighth' })
    expect(s.currentSubdivision()).toBe('quarter') // falls back to this.subdivision
  })

  it('switcher rebuilds the layout exactly at the bar boundary', () => {
    const s = new Scheduler()
    s.timeSignature = { beats: 2, unit: 4 }
    s.subdivision = 'quarter'
    s.subSwitcher = { enabled: true, everyBars: 1, subs: ['quarter', 'sixteenth'] }
    s._recompute()
    s.isPlaying = true
    s.currentStep = 1 // last step of the quarter bar
    s._advance() // wrap -> bars=1 -> recompute -> sixteenth grid
    expect(s.currentStep).toBe(0)
    expect(s._total).toBe(8) // 2 beats × 4
  })
})

describe('per-instrument mixer', () => {
  beforeEach(() => { vi.clearAllMocks() })

  const make = () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0 }
    ex.rows.kick[0] = { on: true, accent: false, roll: 0 }
    s.pattern = ex
    return s
  }

  it('scales a voice gain by its mixer value', () => {
    const s = make()
    s.mixer = { snare: 2 }
    s._scheduleStep(0, 1.0)
    expect(DRUM_VOICES.snare).toHaveBeenCalledWith(fakeCtx, 1.0, expect.anything(), { gain: 0.55 * 2 })
    expect(DRUM_VOICES.kick).toHaveBeenCalledWith(fakeCtx, 1.0, expect.anything(), { gain: 0.55 }) // untouched
  })

  it('a mixer value of 0 mutes the instrument entirely', () => {
    const s = make()
    s.mixer = { snare: 0 }
    s._scheduleStep(0, 1.0)
    expect(DRUM_VOICES.snare).not.toHaveBeenCalled()
    expect(DRUM_VOICES.kick).toHaveBeenCalled()
  })

  it('mixer mute also silences rolls and flams on that instrument', () => {
    const s = new Scheduler()
    s.subdivision = 'quarter'
    s.metronomeEnabled = false
    const ex = createEmptyExercise({ subdivision: 'quarter' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 'open' }
    ex.rows.tom1[0] = { on: true, accent: false, roll: 0, flam: true }
    s.pattern = ex
    s._recompute()
    s.mixer = { snare: 0, tom1: 0 }
    s._scheduleStep(0, 1.0)
    expect(drumRoll).not.toHaveBeenCalled()
    expect(DRUM_VOICES.tom1).not.toHaveBeenCalled()
  })
})
