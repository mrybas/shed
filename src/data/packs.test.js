import { describe, it, expect } from 'vitest'
import { getGroovesPack } from './groovesPack.js'
import { getFillsPack } from './fillsPack.js'
import { buildNotationData } from '../model/notation.js'
import { exerciseTotalSteps, barCount } from '../model/exercise.js'
import { levelOf } from './catalogV2.js'

describe('grooves pack', () => {
  const list = getGroovesPack()

  it('every groove has hits, a level, and renders notation data', () => {
    expect(list.length).toBeGreaterThanOrEqual(10)
    list.forEach((ex) => {
      const onsets = Object.values(ex.rows).flat().filter((c) => c.on).length
      expect(onsets).toBeGreaterThan(2)
      expect(['beginner', 'intermediate', 'advanced']).toContain(levelOf(ex))
      expect(() => buildNotationData(ex)).not.toThrow()
    })
  })

  it('shuffle rides the 1st and 3rd triplet partials', () => {
    const sh = list.find((e) => e.id === 'gv_shuffle')
    const hat = sh.rows.hihatClosed.map((c, i) => (c.on ? i : -1)).filter((i) => i >= 0)
    expect(hat).toEqual([0, 2, 3, 5, 6, 8, 9, 11])
  })

  it('one drop leaves beat 1 empty and lands kick+snare on 3', () => {
    const od = list.find((e) => e.id === 'gv_onedrop')
    expect(od.rows.kick[0].on).toBe(false)
    expect(od.rows.kick[4].on).toBe(true)
    expect(od.rows.snare[4].on).toBe(true)
  })

  it('bossa carries the 3-2 son clave across two bars', () => {
    const b = list.find((e) => e.id === 'gv_bossa')
    expect(barCount(b)).toBe(2)
    const clave = b.rows.snare.map((c, i) => (c.on ? i : -1)).filter((i) => i >= 0)
    expect(clave).toEqual([0, 3, 6, 10, 12])
  })
})

describe('fills pack', () => {
  const list = getFillsPack()

  it('every fill = groove bar + fill bar, valid model, renders', () => {
    expect(list.length).toBeGreaterThanOrEqual(6)
    list.forEach((ex) => {
      expect(barCount(ex)).toBe(2)
      // groove bar intact (money beat)
      expect(ex.rows.kick[0].on).toBe(true)
      expect(ex.rows.snare[2].on).toBe(true)
      expect(ex.rows.hihatClosed[7].on).toBe(true)
      expect(() => buildNotationData(ex)).not.toThrow()
      expect(ex.sticking).toHaveLength(exerciseTotalSteps(ex))
    })
  })

  it('16th fill walks snare → toms → floor', () => {
    const f = list.find((e) => e.id === 'fl_16th_around')
    expect(f.rows.snare[8].on).toBe(true) // fill starts at step 8
    expect(f.rows.tom1[12].on).toBe(true)
    expect(f.rows.tom2[16].on).toBe(true)
    expect(f.rows.floorTom[20].on).toBe(true)
  })
})
