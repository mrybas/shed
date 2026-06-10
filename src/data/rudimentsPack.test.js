import { describe, it, expect } from 'vitest'
import { getRudimentsPack } from './rudimentsPack.js'
import { exerciseTotalSteps } from '../model/exercise.js'
import { buildNotationData } from '../model/notation.js'
import { getCatalogExercises } from './catalogV2.js'

describe('PAS rudiments pack', () => {
  const list = getRudimentsPack()

  it('every rudiment fills its grid exactly and renders', () => {
    expect(list.length).toBeGreaterThanOrEqual(16)
    list.forEach((ex) => {
      expect(ex.rows.snare, ex.id).toHaveLength(exerciseTotalSteps(ex))
      const onsets = ex.rows.snare.filter((c) => c.on)
      expect(onsets.length, ex.id).toBeGreaterThan(0)
      const data = buildNotationData(ex)
      expect(data.totalSteps).toBe(exerciseTotalSteps(ex))
      // sticking only under onsets
      ex.sticking.forEach((st, i) => { if (st) expect(ex.rows.snare[i].on).toBe(true) })
    })
  })

  it('flags map to the right cells (flam, drag, buzz, accent, rest)', () => {
    const byId = (id) => list.find((e) => e.id === `rd_${id}`)
    const swiss = byId('swiss')
    expect(swiss.rows.snare[0].flam).toBe(true)
    expect(swiss.rows.snare[0].accent).toBe(true)
    expect(swiss.rows.snare[1].flam).toBeUndefined()
    const rata = byId('ratamacue')
    expect(rata.rows.snare[0].flam).toBe('drag')
    expect(rata.rows.snare[3].accent).toBe(true)
    const buzz = byId('buzz')
    expect(buzz.rows.snare.every((c) => c.roll === 'closed')).toBe(true)
    const seven = byId('seven')
    expect(seven.rows.snare[7].on).toBe(false) // the rest after the 7th stroke
  })

  it('ids are unique within the whole catalog', () => {
    const all = getCatalogExercises()
    const ids = all.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
