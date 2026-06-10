import { describe, it, expect, vi } from 'vitest'

vi.mock('./AudioEngine.js', () => ({ getNoiseBuffer: () => ({}) }))

import { hihatOpen, hihatClosed } from './drumSynths.js'

// Minimal fake Web Audio nodes — enough for the hi-hat graph.
function fakeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    setTargetAtTime: vi.fn(),
  }
}
function fakeNode(extra = {}) {
  const n = { connect: vi.fn(() => n), start: vi.fn(), stop: vi.fn(), ...extra }
  return n
}
function fakeCtx() {
  const gains = []
  return {
    gains,
    createGain: () => { const g = fakeNode({ gain: fakeParam() }); gains.push(g); return g },
    createBufferSource: () => fakeNode({ buffer: null }),
    createBiquadFilter: () => fakeNode({ type: '', frequency: { value: 0 }, Q: { value: 0 } }),
  }
}

describe('hi-hat choke', () => {
  it('a closed hat chokes a still-ringing open hat', () => {
    const ctx = fakeCtx()
    const dest = fakeNode()
    hihatOpen(ctx, 1.0, dest, { gain: 1 })
    const openAmp = ctx.gains[ctx.gains.length - 1]
    hihatClosed(ctx, 1.2, dest, { gain: 1 })
    expect(openAmp.gain.cancelScheduledValues).toHaveBeenCalledWith(1.2)
    expect(openAmp.gain.setTargetAtTime).toHaveBeenCalledWith(0.0001, 1.2, expect.any(Number))
  })

  it('a closed hat scheduled BEFORE the open one does not choke it', () => {
    const ctx = fakeCtx()
    const dest = fakeNode()
    hihatOpen(ctx, 5.0, dest, { gain: 1 })
    const openAmp = ctx.gains[ctx.gains.length - 1]
    hihatClosed(ctx, 4.5, dest, { gain: 1 })
    expect(openAmp.gain.setTargetAtTime).not.toHaveBeenCalled()
  })
})

// --- Kits ------------------------------------------------------------------
import { DRUM_VOICES, KIT_NAMES, getKit, setKit } from './drumSynths.js'
import { afterEach } from 'vitest'

function fullFakeCtx() {
  const ctx = fakeCtx()
  ctx.createOscillator = () => fakeNode({
    type: '',
    frequency: fakeParam(),
  })
  return ctx
}

describe('drum kits', () => {
  afterEach(() => setKit('acoustic'))

  it('exposes the three kits', () => {
    expect(KIT_NAMES).toEqual(['acoustic', 'electronic', 'pad'])
  })

  it('setKit switches the active kit and persists it', () => {
    setKit('electronic')
    expect(getKit()).toBe('electronic')
    expect(localStorage.getItem('drums2_kit')).toBe('electronic')
  })

  it('ignores unknown kit names', () => {
    setKit('electronic')
    setKit('vinyl')
    expect(getKit()).toBe('electronic')
  })

  it('every voice of every kit builds a sound graph without throwing', () => {
    KIT_NAMES.forEach((name) => {
      setKit(name)
      Object.entries(DRUM_VOICES).forEach(([inst, voice]) => {
        const ctx = fullFakeCtx()
        const dest = fakeNode()
        expect(() => voice(ctx, 1.0, dest, { gain: 1 }), `${name}/${inst}`).not.toThrow()
        expect(ctx.gains.length, `${name}/${inst} makes sound`).toBeGreaterThan(0)
      })
    })
  })

  it('electronic closed hat still chokes an acoustic open hat', () => {
    setKit('acoustic')
    const ctx = fullFakeCtx()
    const dest = fakeNode()
    DRUM_VOICES.hihatOpen(ctx, 1.0, dest, { gain: 1 })
    const openAmp = ctx.gains[ctx.gains.length - 1]
    setKit('electronic')
    DRUM_VOICES.hihatClosed(ctx, 1.2, dest, { gain: 1 })
    expect(openAmp.gain.setTargetAtTime).toHaveBeenCalledWith(0.0001, 1.2, expect.any(Number))
  })
})
