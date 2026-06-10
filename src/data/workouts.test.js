import { describe, it, expect } from 'vitest'
import { WORKOUTS, validateWorkouts, adaptiveStartBpm, generateWorkout } from './workouts.js'
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

describe('adaptiveStartBpm', () => {
  const block = (bpm, maxBpm) => ({ exerciseId: 'x', minutes: 2, note: 'n', settings: { bpm, tempoRamp: { enabled: true, everyBars: 4, stepBpm: 5, maxBpm } } })

  it('resumes a few bpm below the last reached tempo', () => {
    expect(adaptiveStartBpm(block(90, 130), { last: 112 })).toBe(108)
  })
  it('never starts below the base or above ceiling-10', () => {
    expect(adaptiveStartBpm(block(90, 130), { last: 91 })).toBe(null) // 87 -> clamped to base -> no resume
    expect(adaptiveStartBpm(block(90, 130), { last: 200 })).toBe(120) // cap 130-10
  })
  it('no ramp or no history -> null', () => {
    expect(adaptiveStartBpm({ settings: { bpm: 90 } }, { last: 120 })).toBe(null)
    expect(adaptiveStartBpm(block(90, 130), null)).toBe(null)
  })
})

describe('generateWorkout (surprise me)', () => {
  it('is deterministic by seed and valid against the catalog', () => {
    const a = generateWorkout({ level: 'intermediate', minutes: 20, seed: 7 })
    const b = generateWorkout({ level: 'intermediate', minutes: 20, seed: 7 })
    expect(b).toEqual(a)
    const ids = new Set(getCatalogExercises().map((e) => e.id))
    a.blocks.forEach((blk) => expect(ids.has(blk.exerciseId)).toBe(true))
    expect(a.blocks.reduce((t, blk) => t + blk.minutes, 0)).toBe(a.minutes)
    expect(a.minutes).toBeGreaterThanOrEqual(18)
    expect(a.minutes).toBeLessThanOrEqual(22)
  })

  it('shapes the session: warm-up first, ramped technique, gap-trainer last', () => {
    for (const [level, minutes] of [['beginner', 10], ['intermediate', 15], ['advanced', 30]]) {
      const w = generateWorkout({ level, minutes, seed: 3 })
      expect(w.level).toBe(level)
      expect(w.blocks[0].settings.tempoRamp?.enabled).toBe(true) // warm-up ramps
      const last = w.blocks[w.blocks.length - 1]
      expect(last.settings.gapTrainer?.enabled).toBe(true)
      if (minutes >= 15) {
        expect(w.blocks.some((blk) => blk.settings.countIn?.enabled)).toBe(true) // the fill block
      }
      // no duplicate exercises within one session
      const seen = new Set(w.blocks.map((blk) => blk.exerciseId))
      expect(seen.size).toBe(w.blocks.length)
    }
  })
})
