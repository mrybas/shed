import { describe, it, expect } from 'vitest'
import { buildNotationData, durationFor } from './notation.js'
import { getBuiltinExercises } from '../data/builtinExercises.js'
import { createEmptyExercise } from './exercise.js'

const byId = (id) => getBuiltinExercises().find((e) => e.id === id)
const flatTicks = (data) => data.beatsData.flatMap((b) => b.tickables)

describe('durationFor', () => {
  it('maps subdivisions to base VexFlow durations', () => {
    expect(durationFor('quarter')).toBe('q')
    expect(durationFor('eighth')).toBe('8')
    expect(durationFor('sixteenth')).toBe('16')
  })
})

describe('buildNotationData — straight 16ths', () => {
  it('renders all 16th notes when every step is a hit', () => {
    const data = buildNotationData(byId('dci16a_16th'))
    expect(data.beats).toBe(4)
    expect(data.beatsData).toHaveLength(4)
    const ticks = flatTicks(data)
    expect(ticks).toHaveLength(16)
    expect(ticks.every((t) => t.durKind === '16' && !t.rest && t.span === 1)).toBe(true)
    expect(ticks.map((t) => t.sticking).join('')).toBe('RLRRLRLLRLRRLRLL')
  })
})

describe('buildNotationData — duration derived from spacing', () => {
  it('one hit per beat on a 16th grid becomes quarter notes', () => {
    const ex = createEmptyExercise({ subdivision: 'sixteenth' }) // 16 steps, 4 beats
    ex.rows.snare[0] = { on: true, accent: false }
    const data = buildNotationData(ex)
    const beat0 = data.beatsData[0].tickables
    expect(beat0).toHaveLength(1)
    expect(beat0[0]).toMatchObject({ rest: false, durKind: 'q', dots: 0, span: 4, keys: ['c/5'] })
    // empty beats are a single quarter rest
    expect(data.beatsData[1].tickables).toEqual([
      expect.objectContaining({ rest: true, durKind: 'q', span: 4 }),
    ])
  })

  it('hit then a gap of one step becomes a dotted eighth', () => {
    const ex = createEmptyExercise({ subdivision: 'sixteenth' })
    ex.rows.snare[0] = { on: true, accent: false } // steps 0..2 empty after -> next onset at 3
    ex.rows.snare[3] = { on: true, accent: false }
    const beat0 = buildNotationData(ex).beatsData[0].tickables
    expect(beat0[0]).toMatchObject({ durKind: '8', dots: 1, span: 3 }) // dotted eighth
    expect(beat0[1]).toMatchObject({ durKind: '16', span: 1 })
  })

  it('eighth grid: one hit per beat becomes a quarter', () => {
    const ex = createEmptyExercise({ subdivision: 'eighth' }) // 8 steps, 4 beats, spb 2
    ex.rows.snare[0] = { on: true, accent: false }
    const beat0 = buildNotationData(ex).beatsData[0].tickables
    expect(beat0).toHaveLength(1)
    expect(beat0[0]).toMatchObject({ durKind: 'q', span: 2 })
  })
})

describe('buildNotationData — triplets stay per-step', () => {
  it('keeps one tickable per step and marks a triplet bracket per beat', () => {
    const data = buildNotationData(byId('dci16a_triplets'))
    data.beatsData.forEach((b) => {
      expect(b.sub).toBe('triplet')
      expect(b.tickables).toHaveLength(3)
      expect(b.tuplet).toEqual({ num: 3, inTimeOf: 2, groups: 1 })
    })
    expect(flatTicks(data).every((t) => t.durKind === '8')).toBe(true)
  })
})

describe('buildNotationData — cut time scales note durations', () => {
  it('renders 4 eighths + an eighth-triplet sextuplet in 2/2', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 2, unit: 2 }, beatSubs: ['sixteenth', 'sextuplet'] })
    ;[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((i) => { ex.rows.snare[i] = { on: true, accent: false, roll: 0 } })
    const data = buildNotationData(ex)
    // beat 1: four eighth notes (not sixteenths, because beat = half note)
    expect(data.beatsData[0].tickables).toHaveLength(4)
    expect(data.beatsData[0].tickables.every((t) => t.durKind === '8')).toBe(true)
    expect(data.beatsData[0].tuplet).toBeNull()
    // beat 2: six eighth-triplets written as TWO triplet brackets under one beam
    expect(data.beatsData[1].tickables).toHaveLength(6)
    expect(data.beatsData[1].tickables.every((t) => t.durKind === '8')).toBe(true)
    expect(data.beatsData[1].tuplet).toEqual({ num: 3, inTimeOf: 2, groups: 2 })
  })
})

describe('buildNotationData — mixed per-beat subdivisions', () => {
  it('renders a 16th beat then two triplet beats (Stick Control style)', () => {
    const ex = createEmptyExercise({ timeSignature: { beats: 3, unit: 4 }, beatSubs: ['sixteenth', 'triplet', 'triplet'] })
    const data = buildNotationData(ex)
    expect(data.maxSpb).toBe(4)
    expect(data.beatsData[0].tuplet).toBeNull()
    expect(data.beatsData[1].tuplet).toEqual({ num: 3, inTimeOf: 2, groups: 1 })
    expect(data.beatsData[2].tuplet).toEqual({ num: 3, inTimeOf: 2, groups: 1 })
  })
})

describe('buildNotationData — flam', () => {
  it('marks the flam flag on the struck note', () => {
    const ex = createEmptyExercise({ subdivision: 'quarter' }) // 4 beats, 1/beat
    ex.rows.snare[0] = { on: true, accent: false, roll: 0, flam: true }
    const data = buildNotationData(ex)
    expect(data.beatsData[0].tickables[0].flam).toBe(true)
    expect(data.beatsData[1].tickables[0].flam).toBe(false) // empty beat -> rest, no flam
  })
})

describe('buildNotationData — grooves chord per onset', () => {
  it('basic rock: kick+hihat chord on beat 1', () => {
    const data = buildNotationData(byId('builtin_basic_rock')) // eighth grid
    const beat0 = data.beatsData[0].tickables
    expect(beat0[0].keys).toEqual(['f/4', 'g/5/x2']) // kick + closed hat
  })
})
