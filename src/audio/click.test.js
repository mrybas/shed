import { describe, it, expect, vi, beforeEach } from 'vitest'
import { click, setClickMode, setClickBuffer, clickSamplesReady } from './click.js'

function fakeCtx() {
  const made = { sources: [], oscs: [], gains: [] }
  return {
    made,
    createBufferSource: () => {
      const s = { buffer: null, playbackRate: { value: 1 }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn() }
      made.sources.push(s)
      return s
    },
    createOscillator: () => {
      const o = { type: '', frequency: { value: 0 }, connect: vi.fn(() => ({ connect: vi.fn() })), start: vi.fn(), stop: vi.fn() }
      made.oscs.push(o)
      return o
    },
    createGain: () => {
      const g = {
        gain: { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(() => ({ connect: vi.fn() })),
      }
      made.gains.push(g)
      return g
    },
  }
}

describe('click sample mode', () => {
  beforeEach(() => {
    setClickMode('synth')
    setClickBuffer('accent', null)
    setClickBuffer('normal', null)
  })

  it('plays the matching sample at the exact scheduled time', () => {
    const acc = { id: 'acc' }
    const nor = { id: 'nor' }
    setClickBuffer('accent', acc)
    setClickBuffer('normal', nor)
    setClickMode('sample')
    const ctx = fakeCtx()
    click(ctx, 1.25, {}, 'accent', 1)
    click(ctx, 1.75, {}, 'normal', 1)
    expect(ctx.made.sources[0].buffer).toBe(acc)
    expect(ctx.made.sources[0].start).toHaveBeenCalledWith(1.25)
    expect(ctx.made.sources[1].buffer).toBe(nor)
    expect(ctx.made.sources[1].start).toHaveBeenCalledWith(1.75)
    expect(ctx.made.oscs).toHaveLength(0) // no synth voices
  })

  it('one sample covers both roles with different gains; poly is pitched up', () => {
    const only = { id: 'only' }
    setClickBuffer('normal', only)
    setClickMode('sample')
    const ctx = fakeCtx()
    click(ctx, 1, {}, 'accent', 1)
    click(ctx, 2, {}, 'normal', 1)
    click(ctx, 3, {}, 'soft', 1)
    click(ctx, 4, {}, 'poly', 1)
    expect(ctx.made.sources.every((s) => s.buffer === only)).toBe(true)
    const gains = ctx.made.gains.map((g) => g.gain.value)
    expect(gains[0]).toBeGreaterThan(gains[1]) // accent > normal
    expect(gains[2]).toBeLessThan(gains[1]) // soft quietest
    expect(ctx.made.sources[3].playbackRate.value).toBeCloseTo(1.3)
  })

  it('falls back to the synth blip when mode=sample but nothing is loaded', () => {
    setClickMode('sample')
    expect(clickSamplesReady()).toBe(false)
    const ctx = fakeCtx()
    click(ctx, 1, {}, 'accent', 1)
    expect(ctx.made.oscs).toHaveLength(1)
    expect(ctx.made.sources).toHaveLength(0)
  })

  it('synth mode ignores loaded samples', () => {
    setClickBuffer('normal', { id: 'x' })
    setClickMode('synth')
    const ctx = fakeCtx()
    click(ctx, 1, {}, 'normal', 1)
    expect(ctx.made.oscs).toHaveLength(1)
  })
})
