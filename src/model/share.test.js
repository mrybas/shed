import { describe, it, expect } from 'vitest'
import { encodeShare, decodeShare, shareFromHash, ShareLinkError, compactExercise, expandExercise, crc32 } from './share.js'
import { createEmptyExercise, repeatBar, barLayout } from './exercise.js'

// Old (≤ v5.40) link format: full JSON, deflated — must keep opening.
async function legacyEncode(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  const stream = new Response(bytes).body.pipeThrough(new CompressionStream('deflate-raw'))
  const buf = new Uint8Array(await new Response(stream).arrayBuffer())
  let bin = ''
  buf.forEach((b) => { bin += String.fromCharCode(b) })
  return 'd:' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// A song-like exercise: 15 bars of 4/4 sixteenths with a repeating groove.
function song() {
  let ex = createEmptyExercise({ name: 'Song', subdivision: 'sixteenth' })
  ex = repeatBar(ex, 0, 14)
  barLayout(ex).bars.forEach((b) => {
    const s = b.startStep
    ex.rows.kick[s] = { on: true, accent: false, roll: 0 }
    ex.rows.kick[s + 2] = { on: true, accent: false, roll: 0 }
    ex.rows.snare[s + 4] = { on: true, accent: true, roll: 0 }
    ex.rows.snare[s + 7] = { on: true, accent: false, roll: 0, ghost: true }
    ex.rows.hihatClosed[s + 8] = { on: true, accent: false, roll: 0 }
    ex.rows.snare[s + 12] = { on: true, accent: false, roll: 'closed', tie: false }
    ex.rows.ride[s + 6] = { on: true, accent: false, roll: 0, art: 'bell' }
    ex.sticking[s] = 'R'
    ex.sticking[s + 4] = 'L'
  })
  ex.sections = [{ bar: 4, label: 'Verse' }]
  return ex
}

describe('share encoding', () => {
  it('round-trips an exercise exactly (cells, articulations, sticking, sections)', async () => {
    const ex = song()
    const encoded = await encodeShare(ex)
    expect(encoded).toMatch(/^z:[A-Za-z0-9_-]+\.[0-9a-f]{8}$/) // url-safe
    expect(await decodeShare(encoded)).toEqual(ex)
  })

  it('compact links are much shorter than the old full-JSON ones', async () => {
    const ex = song()
    const compact = await encodeShare(ex)
    const legacy = await legacyEncode(ex)
    expect(compact.length).toBeLessThan(legacy.length / 2)
  })

  it('still opens legacy d: links', async () => {
    const ex = song()
    expect(await decodeShare(await legacyEncode(ex))).toEqual(ex)
  })

  it('detects a link that lost characters or had one changed', async () => {
    const encoded = await encodeShare(song())
    const dot = encoded.lastIndexOf('.')
    const mid = Math.floor(dot / 2)
    const dropped = encoded.slice(0, mid) + encoded.slice(mid + 16)
    await expect(decodeShare(dropped)).rejects.toBeInstanceOf(ShareLinkError)
    const flipped = encoded.slice(0, mid) + (encoded[mid] === 'A' ? 'B' : 'A') + encoded.slice(mid + 1)
    await expect(decodeShare(flipped)).rejects.toBeInstanceOf(ShareLinkError)
    await expect(decodeShare(encoded.slice(0, dot))).rejects.toBeInstanceOf(ShareLinkError) // checksum cut off
    await expect(decodeShare('q:zzz')).rejects.toBeInstanceOf(ShareLinkError)
  })

  it('a corrupt legacy link fails loudly too', async () => {
    const legacy = await legacyEncode(song())
    await expect(decodeShare(legacy.slice(0, 200))).rejects.toBeInstanceOf(ShareLinkError)
  })

  it('raw fallback round-trips too', async () => {
    const saved = globalThis.CompressionStream
    // eslint-disable-next-line no-global-assign
    globalThis.CompressionStream = undefined
    try {
      const ex = song()
      ex.name = 'тест юнікод'
      const encoded = await encodeShare(ex)
      expect(encoded.startsWith('j:')).toBe(true)
      expect(await decodeShare(encoded)).toEqual(ex)
    } finally {
      globalThis.CompressionStream = saved
    }
  })

  it('compact form keeps only sounding cells', () => {
    const ex = song()
    const c = compactExercise(ex)
    expect(c.rows).toBeUndefined()
    expect(c.h.kick.slice(0, 3)).toEqual([1, 2, 14]) // plain hits = gaps from the previous hit
    expect(c.h.snare.find((e) => Array.isArray(e) && e[1].ghost)).toBeTruthy()
    expect(c.h.tom1).toBeUndefined() // empty rows omitted
    expect(expandExercise(c)).toEqual(ex)
    expect(expandExercise({ a: 1 })).toEqual({ a: 1 }) // non-compact passes through
  })

  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe('cbf43926')
  })

  it('extracts the payload from a hash', () => {
    expect(shareFromHash('#x=d:abc')).toBe('d:abc')
    expect(shareFromHash('#foo=1&x=z:zz.0a1b2c3d')).toBe('z:zz.0a1b2c3d')
    expect(shareFromHash('#nothing')).toBe(null)
  })
})
