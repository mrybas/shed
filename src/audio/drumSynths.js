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
// Shared across kits so a kit switch mid-pattern still chokes correctly.
let openHats = []

function chokeOpenHats(time) {
  openHats = openHats.filter((h) => h.start + 0.5 > time) // drop fully-decayed ones
  openHats.forEach((h) => {
    if (h.start < time) {
      try {
        h.amp.gain.cancelScheduledValues(time)
        h.amp.gain.setTargetAtTime(0.0001, time, 0.008)
      } catch { /* ignore */ }
    }
  })
}

function registerOpenHat(amp, start) {
  openHats.push({ amp, start })
  if (openHats.length > 8) openHats.shift()
}

export function hihatClosed(ctx, time, destination, { gain = 1 } = {}) {
  chokeOpenHats(time)
  hihat(ctx, time, destination, gain, 0.05)
}

export function hihatOpen(ctx, time, destination, { gain = 1 } = {}) {
  const amp = hihat(ctx, time, destination, gain, 0.4)
  registerOpenHat(amp, time)
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

// ---------------------------------------------------------------------------
// Electronic kit — TR-808-flavoured voices.

// Long sine kick with a deep sweep and a tiny click transient.
function eKick(ctx, time, destination, { gain = 1 } = {}) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(85, time)
  osc.frequency.exponentialRampToValueAtTime(38, time + 0.18)
  amp.gain.setValueAtTime(gain * 1.1, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.55)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.6)

  const clickSrc = noiseSource(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1500
  const camp = ctx.createGain()
  camp.gain.setValueAtTime(gain * 0.3, time)
  camp.gain.exponentialRampToValueAtTime(0.0001, time + 0.02)
  clickSrc.connect(hp).connect(camp).connect(destination)
  clickSrc.start(time)
  clickSrc.stop(time + 0.03)
}

// Two detuned sines + bright noise — the classic 808 snare recipe.
function eSnare(ctx, time, destination, { gain = 1 } = {}) {
  ;[185, 330].forEach((f, i) => {
    const osc = ctx.createOscillator()
    const amp = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(f, time)
    amp.gain.setValueAtTime(gain * (i === 0 ? 0.5 : 0.35), time)
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
    osc.connect(amp).connect(destination)
    osc.start(time)
    osc.stop(time + 0.14)
  })
  const src = noiseSource(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3500
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain * 0.8, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.22)
  src.connect(hp).connect(amp).connect(destination)
  src.start(time)
  src.stop(time + 0.25)
}

// Thin metallic hat from the shared square-cluster voice.
function eHat(ctx, time, destination, gain, decay) {
  const out = ctx.createGain()
  out.gain.setValueAtTime(gain * 0.4, time)
  out.gain.exponentialRampToValueAtTime(0.0001, time + decay)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 8000
  out.connect(hp).connect(destination)
  METAL_RATIOS.forEach((r) => {
    const osc = ctx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = 2800 * r
    osc.connect(out)
    osc.start(time)
    osc.stop(time + decay + 0.02)
  })
  return out
}

function eHihatClosed(ctx, time, destination, { gain = 1 } = {}) {
  chokeOpenHats(time)
  eHat(ctx, time, destination, gain, 0.045)
}

function eHihatOpen(ctx, time, destination, { gain = 1 } = {}) {
  const amp = eHat(ctx, time, destination, gain, 0.35)
  registerOpenHat(amp, time)
}

// Pure sine toms with a gentle sweep — the 808 "boo" family.
function eTom(ctx, time, destination, gain, freq) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq * 1.2, time)
  osc.frequency.exponentialRampToValueAtTime(freq, time + 0.1)
  amp.gain.setValueAtTime(gain * 0.9, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.35)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.38)
}

function eRide(ctx, time, destination, { gain = 1 } = {}) {
  cymbal(ctx, time, destination, gain * 0.8, 0.3, 4200, METAL_RATIOS)
}

function eCrash(ctx, time, destination, { gain = 1 } = {}) {
  const src = noiseSource(ctx)
  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 3000
  const amp = ctx.createGain()
  amp.gain.setValueAtTime(gain * 0.7, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 1.2)
  src.connect(hp).connect(amp).connect(destination)
  src.start(time)
  src.stop(time + 1.25)
}

// ---------------------------------------------------------------------------
// Practice-pad kit — one woody "tock" for everything, slightly pitched per
// instrument so a groove is still readable by ear.

function padTock(ctx, time, destination, gain, pitch) {
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(1100 * pitch, time)
  osc.frequency.exponentialRampToValueAtTime(700 * pitch, time + 0.03)
  amp.gain.setValueAtTime(gain * 0.9, time)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.07)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.09)

  const src = noiseSource(ctx)
  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2400 * pitch
  bp.Q.value = 1.2
  const namp = ctx.createGain()
  namp.gain.setValueAtTime(gain * 0.5, time)
  namp.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
  src.connect(bp).connect(namp).connect(destination)
  src.start(time)
  src.stop(time + 0.06)
}

const PAD_PITCH = {
  kick: 0.7, floorTom: 0.8, tom2: 0.9, tom1: 1.0, snare: 1.05,
  hihatClosed: 1.25, hihatOpen: 1.35, ride: 1.3, crash: 1.2,
}

const padVoice = (inst) => (ctx, time, destination, { gain = 1 } = {}) =>
  padTock(ctx, time, destination, gain, PAD_PITCH[inst] || 1)

// ---------------------------------------------------------------------------
// Kits + dispatch. The active kit is a module-level global (a sound-device
// setting, not an exercise property) persisted under drums2_kit.

const KITS = {
  acoustic: { kick, snare, hihatClosed, hihatOpen, ride, crash, tom1, tom2, floorTom },
  electronic: {
    kick: eKick,
    snare: eSnare,
    hihatClosed: eHihatClosed,
    hihatOpen: eHihatOpen,
    ride: eRide,
    crash: eCrash,
    tom1: (ctx, t, d, o = {}) => eTom(ctx, t, d, o.gain ?? 1, 240),
    tom2: (ctx, t, d, o = {}) => eTom(ctx, t, d, o.gain ?? 1, 170),
    floorTom: (ctx, t, d, o = {}) => eTom(ctx, t, d, o.gain ?? 1, 110),
  },
  pad: Object.fromEntries(
    ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'ride', 'crash', 'tom1', 'tom2', 'floorTom']
      .map((inst) => [inst, padVoice(inst)]),
  ),
}

export const KIT_NAMES = Object.keys(KITS)

const KIT_KEY = 'drums2_kit'

let currentKit = (() => {
  try {
    const k = localStorage.getItem(KIT_KEY)
    return KITS[k] ? k : 'acoustic'
  } catch {
    return 'acoustic'
  }
})()

export function getKit() {
  return currentKit
}

export function setKit(name) {
  if (!KITS[name]) return
  currentKit = name
  try { localStorage.setItem(KIT_KEY, name) } catch { /* ignore */ }
}

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

// Voices dispatch through the active kit at schedule time, so a kit switch
// takes effect immediately (even mid-pattern).
const dispatch = (inst) => (ctx, time, destination, opts) => KITS[currentKit][inst](ctx, time, destination, opts)

export const DRUM_VOICES = {
  kick: dispatch('kick'),
  snare: dispatch('snare'),
  hihatClosed: dispatch('hihatClosed'),
  hihatOpen: dispatch('hihatOpen'),
  ride: dispatch('ride'),
  crash: dispatch('crash'),
  tom1: dispatch('tom1'),
  tom2: dispatch('tom2'),
  floorTom: dispatch('floorTom'),
}
