// Metronome click. Flavours: accent (downbeat), normal (beat), soft (subdivision).
// `volume` is a 0..2 multiplier so the metronome can be balanced against the kit.
export function click(ctx, time, destination, kind = 'normal', volume = 1) {
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
