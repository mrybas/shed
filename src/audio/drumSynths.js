// Synthesized drum voices using Web Audio. Each function schedules a one-shot
// sound at absolute `time` (seconds, in the AudioContext clock) into `destination`.
import { getNoiseBuffer } from './AudioEngine.js'

function noiseSource(ctx) {
  const src = ctx.createBufferSource()
  src.buffer = getNoiseBuffer()
  return src
}

// Kick: sine with a fast downward pitch sweep + amplitude envelope.
export function kick(ctx, time, destination, { gain = 1 } = {}) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(120, time)
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12)
  amp.gain.setValueAtTime(gain, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.32)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.35)
}

// Snare: filtered noise body + a short tonal "crack".
export function snare(ctx, time, destination, { gain = 1 } = {}) {
  const src = noiseSource(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1800
  bp.Q.value = 0.8
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.2)
  src.connect(bp).connect(amp).connect(destination)
  src.start(time)
  src.stop(time + 0.25)

  const osc = ctx.createOscillator()
  const oamp = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, time)
  oamp.gain.setValueAtTime(gain * 0.5, time)
  oamp.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
  osc.connect(oamp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.14)
}

function hihat(ctx, time, destination, gain, decay) {
  const src = noiseSource(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 7000
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain * 0.7, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  src.connect(hp).connect(amp).connect(destination)
  src.start(time)
  src.stop(time + decay + 0.02)
  return amp
}

// Open hats currently ringing — a closed hat chokes them (like a real pedal).
let openHats = []

export function hihatClosed(ctx, time, destination, { gain = 1 } = {}) {
  openHats = openHats.filter((h) => h.start + 0.5 > time) // drop fully-decayed ones
  openHats.forEach((h) => {
    if (h.start < time) {
      try {
        h.amp.gain.cancelScheduledValues(time)
        h.amp.gain.setTargetAtTime(0.0001, time, 0.008)
      } catch { /* ignore */ }
    }
  })
  hihat(ctx, time, destination, gain, 0.05)
}

export function hihatOpen(ctx, time, destination, { gain = 1 } = {}) {
  const amp = hihat(ctx, time, destination, gain, 0.4)
  openHats.push({ amp, start: time })
  if (openHats.length > 8) openHats.shift()
}

// Metallic voice: a cluster of inharmonic square oscillators + noise sheen.
function cymbal(ctx, time, destination, gain, decay, baseFreq, ratios) {
  const out = ctx.createGain()
  out.gain.setValueAtTime(gain * 0.5, time)
  out.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = baseFreq
  out.connect(hp).connect(destination)

  ratios.forEach((r) => {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = baseFreq * r
    osc.connect(out)
    osc.start(time)
    osc.stop(time + decay + 0.02)
  })

  const src = noiseSource(ctx)
  const namp = ctx.createGain()
  namp.gain.setValueAtTime(gain * 0.25, time)
  namp.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  src.connect(namp).connect(hp)
  src.start(time)
  src.stop(time + decay + 0.02)
}

const METAL_RATIOS = [1, 1.34, 1.81, 2.27, 2.67, 3.12]

export function ride(ctx, time, destination, { gain = 1 } = {}) {
  cymbal(ctx, time, destination, gain, 0.45, 3200, METAL_RATIOS)
}

export function crash(ctx, time, destination, { gain = 1 } = {}) {
  cymbal(ctx, time, destination, gain, 1.4, 1800, METAL_RATIOS)
}

// Tom: a pitched membrane — sine/triangle with a downward pitch sweep and a
// short body of filtered noise for attack. `freq` sets the pitch (high→floor).
function tom(ctx, time, destination, gain, freq) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.35, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.12)
  amp.gain.setValueAtTime(gain, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.4)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.42)

  // A touch of noise on the attack for a more "struck" character.
  const src = noiseSource(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq * 2
  bp.Q.value = 0.7
  const namp = ctx.createGain()
  namp.gain.setValueAtTime(gain * 0.25, time)
  namp.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
  src.connect(bp).connect(namp).connect(destination)
  src.start(time)
  src.stop(time + 0.08)
}

export function tom1(ctx, time, destination, { gain = 1 } = {}) { tom(ctx, time, destination, gain, 190) }
export function tom2(ctx, time, destination, { gain = 1 } = {}) { tom(ctx, time, destination, gain, 140) }
export function floorTom(ctx, time, destination, { gain = 1 } = {}) { tom(ctx, time, destination, gain, 95) }

// A roll = a rapid series of strokes on `voice` over `durationSec`.
// open = double-stroke style (alternating louder/softer); closed = denser buzz.
export function drumRoll(ctx, startTime, durationSec, type, destination, gain = 1, voice = snare) {
  const rate = type === 'closed' ? 28 : 13 // strokes per second
  const n = Math.max(2, Math.round(durationSec * rate))
  const dt = durationSec / n
  for (let i = 0; i < n; i++) {
    const t = startTime + i * dt
    const g = gain * (type === 'closed' ? 0.5 : (i % 2 === 0 ? 0.85 : 0.6))
    voice(ctx, t, destination, { gain: g })
  }
}

// Back-compat alias (rolls were snare-only before toms gained them).
export function snareRoll(ctx, startTime, durationSec, type, destination, gain = 1) {
  drumRoll(ctx, startTime, durationSec, type, destination, gain, snare)
}

export const DRUM_VOICES = {
  kick,
  snare,
  hihatClosed,
  hihatOpen,
  ride,
  crash,
  tom1,
  tom2,
  floorTom,
}
