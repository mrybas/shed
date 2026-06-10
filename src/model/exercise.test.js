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
  setAllBeatSubs,
  exerciseTotalSteps,
  getBars,
  barCount,
  barLayout,
  addBar,
  insertBar,
  barSnapshot,
  repeatBar,
  duplicateBar,
  removeBar,
  setBarTimeSignature,
  normalizeExercise,
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

describe('bars (multi-bar exercises)', () => {
  it('single-bar exercises report one bar and carry no bars field', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'sixteenth' })
    expect(ex.bars).toBeUndefined()
    expect(barCount(ex)).toBe(1)
    expect(getBars(ex)).toEqual([{ ts: { beats: 4, unit: 4 }, beatSubs: ['sixteenth', 'sixteenth', 'sixteenth', 'sixteenth'] }])
  })

  it('addBar appends a bar of empty steps, extending flat rows', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' }) // 8 steps
    ex.rows.snare[0] = { on: true, accent: false, roll: 0 }
    ex = addBar(ex)
    expect(barCount(ex)).toBe(2)
    expect(ex.rows.snare).toHaveLength(16) // 8 + 8
    expect(ex.rows.snare[0].on).toBe(true)
    expect(ex.rows.snare.slice(8).every((c) => !c.on)).toBe(true)
    expect(exerciseTotalSteps(ex)).toBe(16)
  })

  it('insertBar inserts an empty bar BEFORE the given index, shifting steps', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' }) // 2 steps/bar
    ex.rows.snare[0] = { on: true, accent: true, roll: 0 } // bar 0 content
    ex = insertBar(ex, 0) // empty bar before the first
    expect(barCount(ex)).toBe(2)
    expect(ex.rows.snare).toHaveLength(4)
    expect(ex.rows.snare[0].on).toBe(false) // new empty bar first
    expect(ex.rows.snare[2].on).toBe(true) // old content shifted to bar 2
  })

  it('insertBar in the middle copies the neighbouring bar\'s meter', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'quarter' })
    ex = addBar(ex)
    ex = setBarTimeSignature(ex, 1, { beats: 3, unit: 4 }) // bars: 4/4, 3/4
    ex = insertBar(ex, 1) // before the 3/4 bar -> copies 3/4
    expect(getBars(ex).map((b) => b.ts.beats)).toEqual([4, 3, 3])
  })

  it('duplicateBar copies meter, cells and sticking right after the bar', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' })
    ex.rows.kick[0] = { on: true, accent: false, roll: 0 }
    ex.sticking[0] = 'R'
    ex = duplicateBar(ex, 0)
    expect(barCount(ex)).toBe(2)
    expect(ex.rows.kick[2].on).toBe(true) // copy in bar 2
    expect(ex.sticking[2]).toBe('R')
    expect(ex.rows.kick[0].on).toBe(true) // original untouched
  })

  it('addBar copies the full beatSubs of the last bar (not just the first sub)', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, beatSubs: ['sixteenth', 'triplet'] })
    ex = addBar(ex)
    expect(getBars(ex)[1].beatSubs).toEqual(['sixteenth', 'triplet'])
    expect(exerciseTotalSteps(ex)).toBe(14) // (4+3) × 2
  })

  it('removeBar splices that bar out and keeps the others intact', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'quarter' }) // 2 steps/bar
    ex = addBar(ex); ex = addBar(ex) // 3 bars, 6 steps
    ex.rows.kick[0] = { on: true, accent: false, roll: 0 } // bar 0
    ex.rows.kick[4] = { on: true, accent: false, roll: 0 } // bar 2
    ex = removeBar(ex, 1) // drop middle bar
    expect(barCount(ex)).toBe(2)
    expect(ex.rows.kick).toHaveLength(4)
    expect(ex.rows.kick[0].on).toBe(true) // old bar 0 preserved
    expect(ex.rows.kick[2].on).toBe(true) // old bar 2 now at steps 2..3
  })

  it('removeBar refuses to drop the last remaining bar', () => {
    const ex = createEmptyExercise()
    expect(removeBar(ex, 0)).toBe(ex)
  })

  it('per-bar time signature changes only that bar', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'quarter' }) // 4 steps
    ex = addBar(ex) // 2 bars, 8 steps
    ex = setBarTimeSignature(ex, 1, { beats: 3, unit: 4 }) // bar 1 -> 3 beats
    expect(getBars(ex)[0].ts).toEqual({ beats: 4, unit: 4 })
    expect(getBars(ex)[1].ts).toEqual({ beats: 3, unit: 4 })
    expect(exerciseTotalSteps(ex)).toBe(7) // 4 + 3
    expect(ex.rows.snare).toHaveLength(7)
  })

  it('barLayout gives per-bar step ranges and global beat indices', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'eighth' }) // 4 steps/bar
    ex = addBar(ex)
    const layout = barLayout(ex)
    expect(layout.totalSteps).toBe(8)
    expect(layout.bars[1].startStep).toBe(4)
    expect(layout.bars[1].beats[0].globalBeat).toBe(2)
  })

  it('setAllBeatSubs applies one grid value everywhere but keeps per-bar meters', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'sixteenth' })
    ex = addBar(ex)
    ex = setBarTimeSignature(ex, 1, { beats: 3, unit: 4 })
    ex = setBeatSub(ex, 1, 'triplet') // mixed beat to be overwritten
    ex = setAllBeatSubs(ex, 'eighth')
    expect(getBars(ex)[0].ts).toEqual({ beats: 4, unit: 4 })
    expect(getBars(ex)[1].ts).toEqual({ beats: 3, unit: 4 }) // meter preserved
    expect(getBars(ex)[0].beatSubs).toEqual(['eighth', 'eighth', 'eighth', 'eighth'])
    expect(getBars(ex)[1].beatSubs).toEqual(['eighth', 'eighth', 'eighth'])
  })

  it('setBeatSub targets the right bar by global beat index', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 4 }, subdivision: 'sixteenth' })
    ex = addBar(ex) // 2 bars × 2 beats = global beats 0..3
    ex = setBeatSub(ex, 3, 'triplet') // bar 1, beat 1
    expect(getBars(ex)[1].beatSubs).toEqual(['sixteenth', 'triplet'])
    expect(getBars(ex)[0].beatSubs).toEqual(['sixteenth', 'sixteenth'])
  })

  it('multi-bar exercises round-trip through parseImported', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex = addBar(ex)
    ex = setBarTimeSignature(ex, 1, { beats: 2, unit: 4 })
    ex.rows.snare[0] = { on: true, accent: true, roll: 0 }
    const parsed = parseImported(JSON.stringify(ex))
    expect(barCount(parsed)).toBe(2)
    expect(getBars(parsed)[1].ts).toEqual({ beats: 2, unit: 4 })
    expect(parsed.rows.snare[0]).toEqual({ on: true, accent: true, roll: 0 })
  })

  it('preserves the ghost flag through resize and import', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, ghost: true }
    const grown = resizeExercise(ex, ex.timeSignature, 'sixteenth')
    expect(grown.rows.snare[0].ghost).toBe(true)
    const parsed = parseImported(JSON.stringify(grown))
    expect(parsed.rows.snare[0].ghost).toBe(true)
    expect(parsed.rows.snare[1].ghost).toBeUndefined()
  })

  it('preserves the flam flag through resize and import (and only when set)', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, flam: true }
    // plain cells stay minimal (no flam key) so legacy equality checks hold
    expect(ex.rows.snare[1]).toEqual({ on: false, accent: false, roll: 0 })
    const grown = resizeExercise(ex, ex.timeSignature, 'sixteenth')
    expect(grown.rows.snare[0].flam).toBe(true)
    const parsed = parseImported(JSON.stringify(grown))
    expect(parsed.rows.snare[0].flam).toBe(true)
    expect(parsed.rows.snare[1].flam).toBeUndefined()
  })

  it('preserves the art flag through resize and import (and only when set)', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, art: 'cross' }
    ex.rows.ride[2] = { on: true, accent: false, roll: 0, art: 'bell' }
    const grown = resizeExercise(ex, ex.timeSignature, 'sixteenth')
    expect(grown.rows.snare[0].art).toBe('cross')
    const parsed = parseImported(JSON.stringify(grown))
    expect(parsed.rows.snare[0].art).toBe('cross')
    expect(parsed.rows.ride[4].art).toBe('bell')
    expect(parsed.rows.snare[2].art).toBeUndefined()
  })

  it('new exercises include the hihatPedal row', () => {
    const ex = createEmptyExercise({})
    expect(ex.rows.hihatPedal).toHaveLength(16)
    // old files without the row gain it on import
    const legacy = JSON.parse(JSON.stringify(ex))
    delete legacy.rows.hihatPedal
    const parsed = parseImported(JSON.stringify(legacy))
    expect(parsed.rows.hihatPedal).toHaveLength(16)
  })

  it('normalizeExercise adds missing tom rows to older saves', () => {
    const legacy = { app: 'drums', timeSignature: { beats: 4, unit: 4 }, subdivision: 'quarter', rows: { snare: [{ on: true, accent: false, roll: 0 }, {}, {}, {}] }, sticking: [] }
    const norm = normalizeExercise(legacy)
    expect(norm.rows.tom1).toHaveLength(4)
    expect(norm.rows.floorTom).toHaveLength(4)
    expect(norm.rows.snare[0].on).toBe(true)
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

  it('round-trips a whole-library backup file', () => {
    const a = createEmptyExercise({ name: 'One' })
    let b = createEmptyExercise({ name: 'Two', subdivision: 'eighth' })
    b = addBar(b)
    b.rows.snare[0] = { on: true, accent: true, roll: 0 }
    const file = JSON.stringify({ app: 'drums', type: 'library', version: 1, exercises: [a, b] })
    const parsed = parseImported(file)
    expect(parsed.type).toBe('library')
    expect(parsed.exercises).toHaveLength(2)
    expect(parsed.exercises[1].name).toBe('Two')
    expect(parsed.exercises[1].rows.snare[0].accent).toBe(true)
    expect(barCount(parsed.exercises[1])).toBe(2)
    expect(parsed.exercises[0].id).not.toBe(a.id) // re-id'd on import
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

describe('bar clipboard + repeat', () => {
  it('barSnapshot captures meter, cells and sticking; insertBar pastes it anywhere', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex.rows.kick[0] = { on: true, accent: true, roll: 0 }
    ex.sticking[0] = 'R'
    ex = addBar(ex) // bar 2 empty
    const snap = barSnapshot(ex, 0)
    expect(snap.bar.ts).toEqual({ beats: 4, unit: 4 })
    expect(snap.cells.rows.kick[0].on).toBe(true)
    const pasted = insertBar(ex, 2, snap) // paste at the end
    expect(barCount(pasted)).toBe(3)
    const lay = barLayout(pasted)
    const start = lay.bars[2].startStep
    expect(pasted.rows.kick[start].on).toBe(true)
    expect(pasted.rows.kick[start].accent).toBe(true)
    expect(pasted.sticking[start]).toBe('R')
  })

  it('repeatBar inserts N copies right after the bar', () => {
    let ex = createEmptyExercise({ timeSignature: { beats: 4, unit: 4 }, subdivision: 'eighth' })
    ex.rows.snare[2] = { on: true, accent: false, roll: 0 }
    const out = repeatBar(ex, 0, 4)
    expect(barCount(out)).toBe(5)
    const lay = barLayout(out)
    lay.bars.forEach((b) => {
      expect(out.rows.snare[b.startStep + 2].on).toBe(true)
    })
  })
})
