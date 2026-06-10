import { describe, it, expect } from 'vitest'
import { WORKOUTS, validateWorkouts } from './workouts.js'
import { getCatalogExercises } from './catalogV2.js'

describe('built-in workouts', () => {
  it('reference only real exercises and block minutes add up', () => {
    expect(validateWorkouts(getCatalogExercises())).toEqual([])
  })

  it('cover all three levels and the 10–30 minute range', () => {
    const levels = new Set(WORKOUTS.map((w) => w.level))
    expect([...levels].sort()).toEqual(['advanced', 'beginner', 'intermediate'])
    const mins = WORKOUTS.map((w) => w.minutes)
    expect(Math.min(...mins)).toBe(10)
    expect(Math.max(...mins)).toBe(30)
  })

  it('every block carries a focus note and sane settings', () => {
    WORKOUTS.forEach((w) => w.blocks.forEach((b) => {
      expect(b.note.length).toBeGreaterThan(5)
      expect(b.minutes).toBeGreaterThan(0)
      if (b.settings.bpm) expect(b.settings.bpm).toBeGreaterThanOrEqual(50)
      if (b.settings.tempoRamp) expect(b.settings.tempoRamp.maxBpm).toBeGreaterThan(b.settings.bpm)
    }))
  })
})
