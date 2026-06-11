// Metronome click. Flavours: accent (downbeat), normal (beat), soft (subdivision).
// `volume` is a 0..2 multiplier so the metronome can be balanced against the kit.
//
// Two modes: the built-in synth blip, or user samples (uploaded in the Sound
// settings; stored in IndexedDB, decoded at startup). With samples, 'accent'
// uses the accent slot (falling back to the normal one, louder) and vice
// versa; subdivisions play quieter, the polyrhythm voice is pitched up so the
// two streams stay distinguishable.

let clickMode = 'synth' // 'synth' | 'sample'
const clickBuffers = { accent: null, normal: null }

export function setClickMode(mode) {
  clickMode = mode === 'sample' ? 'sample' : 'synth'
}

export function setClickBuffer(slot, audioBuffer) {
  if (slot === 'accent' || slot === 'normal') clickBuffers[slot] = audioBuffer || null
}

export function clickSamplesReady() {
  return !!(clickBuffers.accent || clickBuffers.normal)
}

function sampleClick(ctx, time, destination, kind, volume) {
  const buf = kind === 'accent'
    ? (clickBuffers.accent || clickBuffers.normal)
    : (clickBuffers.normal || clickBuffers.accent)
  // Dynamics mirror the synth flavours; when one sample covers both roles the
  // gain difference keeps the downbeat audible.
  const baseGain = kind === 'accent' ? 1.0 : kind === 'soft' ? 0.3 : kind === 'poly' ? 0.7 : 0.55
  const src = ctx.createBufferSource()
  src.buffer = buf
  if (kind === 'poly') src.playbackRate.value = 1.3 // pitched up: a separate stream
  const amp = ctx.createGain()
  amp.gain.value = Math.max(0.0001, baseGain * volume)
  src.connect(amp).connect(destination)
  src.start(time)
}

export function click(ctx, time, destination, kind = 'normal', volume = 1) {
  if (clickMode === 'sample' && clickSamplesReady()) {
    sampleClick(ctx, time, destination, kind, volume)
    return
  }
  // 'poly' is the second voice of the polyrhythm trainer — lower and woodier
  // so the two streams are easy to tell apart.
  const freq = kind === 'accent' ? 1500 : kind === 'soft' ? 800 : kind === 'poly' ? 590 : 1000
  const baseGain = kind === 'accent' ? 0.9 : kind === 'soft' ? 0.3 : kind === 'poly' ? 0.7 : 0.6
  const gain = Math.max(0.0001, baseGain * volume)

  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  amp.gain.setValueAtTime(0.0001, time)
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.001)
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.04)
  osc.connect(amp).connect(destination)
  osc.start(time)
  osc.stop(time + 0.05)
}
