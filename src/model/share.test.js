import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare, shareFromHash } from './share.js'
import { createEmptyExercise } from './exercise.js'

describe('share encoding', () => {
  it('round-trips an exercise through the URL payload', async () => {
    const ex = createEmptyExercise({ name: 'Shared groove', subdivision: 'eighth' })
    ex.rows.snare[0] = { on: true, accent: true, roll: 0 }
    const encoded = await encodeShare(ex)
    expect(encoded).toMatch(/^(d|r):[A-Za-z0-9_-]+$/) // url-safe
    const decoded = await decodeShare(encoded)
    expect(decoded.name).toBe('Shared groove')
    expect(decoded.rows.snare[0].accent).toBe(true)
  })

  it('raw fallback round-trips too', async () => {
    const saved = globalThis.CompressionStream
    // eslint-disable-next-line no-global-assign
    globalThis.CompressionStream = undefined
    try {
      const encoded = await encodeShare({ a: 1, тест: 'юнікод' })
      expect(encoded.startsWith('r:')).toBe(true)
      expect(await decodeShare(encoded)).toEqual({ a: 1, тест: 'юнікод' })
    } finally {
      globalThis.CompressionStream = saved
    }
  })

  it('extracts the payload from a hash', () => {
    expect(shareFromHash('#x=d:abc')).toBe('d:abc')
    expect(shareFromHash('#foo=1&x=r:zz')).toBe('r:zz')
    expect(shareFromHash('#nothing')).toBe(null)
  })
})
