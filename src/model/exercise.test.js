import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  INSTRUMENTS,
  SUBDIVISIONS,
  stepsPerBeat,
  totalSteps,
  createEmptyExercise,
  resizeExercise,
  exportExercise,
  parseImported,
  loadLibrary,
  saveToLibrary,
  deleteFromLibrary,
  strokeTypeTag,
  beatRanges,
  setBeatSub,
  exerciseTotalSteps,
} from './exercise.js'

describe('per-beat subdivisions', () => {
  it('createEmptyExercise has uniform beatSubs by default', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'sixteenth' })
    expect(ex.beatSubs).toEqual(['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'])
  })

  it('mixed beatSubs give correct total steps and ranges', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 3, unit: 4 }, beatSubs: ['sixteenth', 'triplet', 'triplet'] })
    expect(exerciseTotalSteps(ex)).toBe(10)
    expect(ex.rows.snare).toHaveLength(10)
    expect(beatRanges(ex)).toEqual([
      { beat: 0, start: 0, len: 4, sub: 'sixteenth' },
      { beat: 1, start: 4, len: 3, sub: 'triplet' },
      { beat: 2, start: 7, len: 3, sub: 'triplet' },
    ])
  })

  it('setBeatSub changes one beat and preserves the others', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'sixteenth' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0 }
    ex.rows.snare[4] = { on: true, accent: false, roll: 0 }
    ex = setBeatSub(ex, 1, 'triplet')
    expect(ex.beatSubs).toEqual(['sixteenth', 'triplet'])
    expect(ex.rows.snare).toHaveLength(7)
    expect(ex.rows.snare[0].on).toBe(true)
    expect(ex.rows.snare[4].on).toBe(true)
  })
})

describe('strokeTypeTag', () => {
  it('classifies by longest same-hand run', () => {
    expect(strokeTypeTag('RLRLRLRL')).toBe('singles')
    expect(strokeTypeTag('RRLLRRLL')).toBe('doubles')
    expect(strokeTypeTag('RRRLRRRL')).toBe('triples')
    expect(strokeTypeTag('RRRRLLLL')).toBe('quads')
    expect(strokeTypeTag('')).toBe('mixed')
  })
})

describe('subdivision math', () => {
  it('maps subdivisions to steps per beat', () => {
    expect(stepsPerBeat('quarter')).toBe(1)
    expect(stepsPerBeat('eighth')).toBe(2)
    expect(stepsPerBeat('triplet')).toBe(3)
    expect(stepsPerBeat('sixteenth')).toBe(4)
    expect(stepsPerBeat('unknown')).toBe(1)
  })

  it('computes total steps from time signature and subdivision', () => {
    expect(totalSteps({ beats: 4, unit: 4 }, 'sixteenth')).toBe(16)
    expect(totalSteps({ beats: 4, unit: 4 }, 'eighth')).toBe(8)
    expect(totalSteps({ beats: 3, unit: 4 }, 'quarter')).toBe(3)
    expect(totalSteps({ beats: 6, unit: 8 }, 'eighth')).toBe(12)
    expect(totalSteps({ beats: 8, unit: 4 }, 'triplet')).toBe(24)
  })
})

describe('createEmptyExercise', () => {
  it('creates rows for every instrument with correct length, all off', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'sixteenth' })
    expect(ex.app).toBe('drums')
    INSTRUMENTS.forEach((inst) => {
      expect(ex.rows[inst]).toHaveLength(16)
      expect(ex.rows[inst].every((c) => c.on === false && c.accent === false)).toBe(true)
    })
    expect(ex.sticking).toHaveLength(16)
    expect(ex.sticking.every((s) => s === '')).toBe(true)
  })

  it('uses sensible defaults', () => {
    const ex = createEmptyExercise()
    expect(ex.timeSignature).toEqual({ beats: 4, unit: 4 })
    expect(ex.subdivision).toBe('sixteenth')
    expect(ex.bpm).toBe(90)
  })
})

describe('resizeExercise', () => {
  it('preserves cells by beat-position when growing/shrinking', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' }) // 8 steps, 2/beat
    ex.rows.snare[0] = { on: true, accent: true, roll: 0 }  // beat 0, pos 0
    ex.rows.snare[7] = { on: true, accent: false, roll: 0 } // beat 3, pos 1
    ex.sticking[0] = 'R'

    // grow to sixteenth (16 steps, 4/beat) — beat 3 pos 1 -> step 13
    const grown = resizeExercise(ex, ex.timeSignature, 'sixteenth')
    expect(grown.rows.snare).toHaveLength(16)
    expect(grown.rows.snare[0]).toEqual({ on: true, accent: true, roll: 0 })
    expect(grown.rows.snare[13]).toEqual({ on: true, accent: false, roll: 0 })
    expect(grown.rows.snare[1]).toEqual({ on: false, accent: false, roll: 0 })
    expect(grown.sticking[0]).toBe('R')

    // shrink to quarter (4 steps, 1/beat) — beat 0 pos 0 kept, beat 3 pos 1 dropped
    const shrunk = resizeExercise(grown, grown.timeSignature, 'quarter')
    expect(shrunk.rows.snare).toHaveLength(4)
    expect(shrunk.rows.snare[0]).toEqual({ on: true, accent: true, roll: 0 })
  })
})

describe('parseImported', () => {
  it('round-trips a valid exercise', () => {
    const ex = createEmptyExercise({ name: 'Test', subdivision: 'eighth' })
    ex.rows.kick[0] = { on: true, accent: false }
    ex.sticking[0] = 'R'
    const json = JSON.stringify(ex)
    const parsed = parseImported(json)
    expect(parsed.name).toBe('Test')
    expect(parsed.rows.kick[0]).toEqual({ on: true, accent: false, roll: 0 })
    expect(parsed.sticking[0]).toBe('R')
    expect(parsed.id).not.toBe(ex.id) // new id assigned on import
  })

  it('rejects non-drums files', () => {
    expect(() => parseImported('{"app":"other"}')).toThrow()
    expect(() => parseImported('not json')).toThrow('Invalid JSON')
    expect(() => parseImported('{"app":"drums"}')).toThrow() // missing rows/timeSignature
  })

  it('normalizes missing instrument rows to correct length', () => {
    const partial = {
      app: 'drums',
      timeSignature: { beats: 4, unit: 4 },
      subdivision: 'eighth',
      rows: { snare: [{ on: true, accent: false }] },
    }
    const parsed = parseImported(JSON.stringify(partial))
    INSTRUMENTS.forEach((inst) => expect(parsed.rows[inst]).toHaveLength(8))
    expect(parsed.rows.snare[0]).toEqual({ on: true, accent: false, roll: 0 })
    expect(parsed.rows.kick[0]).toEqual({ on: false, accent: false, roll: 0 })
  })
})

describe('exportExercise', () => {
  it('triggers a download without throwing', () => {
    const created = URL.createObjectURL
    const revoked = URL.revokeObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const ex = createEmptyExercise({ name: 'My Exercise' })
    expect(() => exportExercise(ex)).not.toThrow()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(clickSpy).toHaveBeenCalledOnce()

    URL.createObjectURL = created
    URL.revokeObjectURL = revoked
    clickSpy.mockRestore()
  })
})

describe('localStorage library', () => {
  beforeEach(() => localStorage.clear())

  it('saves, loads, updates and deletes', () => {
    expect(loadLibrary()).toEqual([])

    const a = createEmptyExercise({ name: 'A' })
    const b = createEmptyExercise({ name: 'B' })
    saveToLibrary(a)
    saveToLibrary(b)
    expect(loadLibrary()).toHaveLength(2)

    // update existing (same id) does not duplicate
    saveToLibrary({ ...a, name: 'A2' })
    const lib = loadLibrary()
    expect(lib).toHaveLength(2)
    expect(lib.find((e) => e.id === a.id).name).toBe('A2')

    deleteFromLibrary(a.id)
    const after = loadLibrary()
    expect(after).toHaveLength(1)
    expect(after[0].id).toBe(b.id)
  })
})
