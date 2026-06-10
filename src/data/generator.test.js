import { describe, it, expect } from 'vitest'
import { generateRhythm, exerciseOfTheDay, hashSeed } from './generator.js'
import { barLayout } from '../model/exercise.js'
import { buildNotationData } from '../model/notation.js'

describe('generateRhythm', () => {
  it('is deterministic for a given seed and differs across seeds', () => {
    const a = generateRhythm({ level: 'intermediate', bars: 2, seed: 42 })
    const b = generateRhythm({ level: 'intermediate', bars: 2, seed: 42 })
    expect(b).toEqual(a)
    const c = generateRhythm({ level: 'intermediate', bars: 2, seed: 43 })
    expect(JSON.stringify(c.rows.snare)).not.toBe(JSON.stringify(a.rows.snare))
  })

  it('produces a valid model: row lengths match the layout, sticking only on onsets', () => {
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      for (let seed = 1; seed <= 20; seed++) {
        const ex = generateRhythm({ level, bars: 2, seed })
        const layout = barLayout(ex)
        expect(ex.rows.snare).toHaveLength(layout.totalSteps)
        expect(ex.sticking).toHaveLength(layout.totalSteps)
        ex.sticking.forEach((s, i) => {
          if (s) expect(ex.rows.snare[i].on).toBe(true)
          if (ex.rows.snare[i].on) expect(['R', 'L']).toContain(s)
        })
        // The piece never starts on a rest.
        expect(ex.rows.snare[0].on).toBe(true)
      }
    }
  })

  it('respects level vocabularies', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const beg = generateRhythm({ level: 'beginner', bars: 2, seed })
      barLayout(beg).bars.forEach((b) => b.beats.forEach((bt) => expect(bt.sub).toBe('eighth')))
      expect(beg.rows.snare.some((c) => c.accent || c.flam)).toBe(false)

      const adv = generateRhythm({ level: 'advanced', bars: 2, seed })
      expect(adv.level).toBe('advanced')
    }
    // Across seeds, advanced mixes in triplets at least sometimes.
    const subs = new Set()
    for (let seed = 1; seed <= 30; seed++) {
      barLayout(generateRhythm({ level: 'advanced', bars: 2, seed })).bars
        .forEach((b) => b.beats.forEach((bt) => subs.add(bt.sub)))
    }
    expect(subs.has('triplet')).toBe(true)
    expect(subs.has('sixteenth')).toBe(true)
  })

  it('renders to notation without errors for many seeds', () => {
    for (const level of ['beginner', 'intermediate', 'advanced']) {
      for (let seed = 1; seed <= 30; seed++) {
        const data = buildNotationData(generateRhythm({ level, bars: 2, seed }))
        expect(data.totalSteps).toBeGreaterThan(0)
        expect(data.barsMeta).toHaveLength(2)
      }
    }
  })

  it('exercise of the day is stable per date and varies across dates', () => {
    const a = exerciseOfTheDay('2026-06-10')
    const b = exerciseOfTheDay('2026-06-10')
    expect(b).toEqual(a)
    expect(a.id).toBe('daily_2026-06-10')
    const c = exerciseOfTheDay('2026-06-11')
    expect(c.id).not.toBe(a.id)
    expect(hashSeed('2026-06-10')).not.toBe(hashSeed('2026-06-11'))
  })

  it('generated exercises are read-only (non-user source)', () => {
    expect(generateRhythm({ seed: 5 }).source).toBe('generated')
  })
})
