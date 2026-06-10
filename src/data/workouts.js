// Built-in daily workouts: ordered blocks of catalog exercises with per-block
// playback settings (tempo, speed/gap trainer, swing, count-in). Built on the
// standard practice principles: warm up slow, raise tempo gradually (Stone's
// "20 relaxed repetitions" idea automated by the speed trainer), work dynamics,
// finish with a timekeeping test on the gap trainer.

const ramp = (everyBars, stepBpm, maxBpm) => ({ tempoRamp: { enabled: true, everyBars, stepBpm, maxBpm } })
const gap = (onBars, offBars) => ({ gapTrainer: { enabled: true, onBars, offBars } })
const countInEach = { countIn: { enabled: true, bars: 1, mode: 'phrase', feel: 'quarter' } }

export const WORKOUTS = [
  {
    id: 'wk_beg_10',
    name: 'Beginner Daily',
    level: 'beginner',
    minutes: 10,
    description: 'The daily minimum for new drummers: even hands, first doubles, your first groove, and a short timing test.',
    blocks: [
      { exerciseId: 'fs_quarters', minutes: 2, note: 'Relaxed full strokes. Let the stick rebound.', settings: { bpm: 60 } },
      { exerciseId: 'fs_eighths', minutes: 2, note: 'Stay even between the hands.', settings: { bpm: 60, ...ramp(4, 4, 80) } },
      { exerciseId: 'fs_doubles_slow', minutes: 2, note: 'Two clean strokes per hand — no buzzing.', settings: { bpm: 60, ...ramp(4, 4, 76) } },
      { exerciseId: 'fs_money_beat', minutes: 3, note: 'Lock kick and hat together; snare relaxed.', settings: { bpm: 70 } },
      { exerciseId: 'fs_kick_snare', minutes: 1, note: 'Timing test: keep it steady when the click drops out.', settings: { bpm: 65, ...gap(2, 2) } },
    ],
  },
  {
    id: 'wk_beg_15',
    name: 'Beginner Builder',
    level: 'beginner',
    minutes: 15,
    description: 'A fuller session: hands, first 16ths, two grooves and your first fill drilled with a count-in on every pass.',
    blocks: [
      { exerciseId: 'fs_eighths', minutes: 2, note: 'Warm-up. Watch the rebound.', settings: { bpm: 60, ...ramp(4, 5, 85) } },
      { exerciseId: 'fs_doubles_slow', minutes: 3, note: 'Doubles still slow and even.', settings: { bpm: 60, ...ramp(4, 4, 80) } },
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'First 16th notes — quiet hands, no tension.', settings: { bpm: 70 } },
      { exerciseId: 'fs_money_beat', minutes: 3, note: 'Groove time. Make it feel good, not just correct.', settings: { bpm: 72 } },
      { exerciseId: 'fs_half_time', minutes: 2, note: 'Big spacious backbeat on 3.', settings: { bpm: 70 } },
      { exerciseId: 'fs_first_fill', minutes: 2, note: 'One pass per count-in: think the fill before playing it.', settings: { bpm: 65, ...countInEach } },
    ],
  },
  {
    id: 'wk_int_10',
    name: 'Intermediate Daily',
    level: 'intermediate',
    minutes: 10,
    description: 'Singles and doubles pushed up the metronome, paradiddle accents, and a groove with the click dropping out.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Warm-up ramp. Stop the ramp where tension starts.', settings: { bpm: 90, ...ramp(4, 5, 130) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Open doubles — second note as strong as the first.', settings: { bpm: 80, ...ramp(4, 5, 120) } },
      { exerciseId: 'dci16a_16th', minutes: 3, note: 'Paradiddles: accents pop, taps whisper.', settings: { bpm: 90 } },
      { exerciseId: 'builtin_basic_rock', minutes: 2, note: 'Timekeeping: hold the groove through the silence.', settings: { bpm: 96, ...gap(2, 2) } },
    ],
  },
  {
    id: 'wk_int_20',
    name: 'Intermediate Shed',
    level: 'intermediate',
    minutes: 20,
    description: 'The full hands menu: ramped singles/doubles/triples, paradiddle variations, flam taps, triplets and a shuffle groove.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Warm-up ramp.', settings: { bpm: 90, ...ramp(4, 5, 130) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Doubles ramp — relaxed at the top or lower the cap.', settings: { bpm: 80, ...ramp(4, 5, 120) } },
      { exerciseId: 'sc_sb_9', minutes: 3, note: 'Triples (RRRL): even three per hand.', settings: { bpm: 70, ...ramp(4, 5, 100) } },
      { exerciseId: 'dci16a_16th', minutes: 3, note: 'Paradiddle accents.', settings: { bpm: 90 } },
      { exerciseId: 'dci16a_inverted', minutes: 2, note: 'Inverted paradiddle — accent moves, hands stay calm.', settings: { bpm: 80 } },
      { exerciseId: 'builtin_flam_tap', minutes: 3, note: 'Flam taps: grace notes low, taps even.', settings: { bpm: 70 } },
      { exerciseId: 'dci16a_triplets', minutes: 2, note: 'Paradiddles over a triplet pulse.', settings: { bpm: 80 } },
      { exerciseId: 'builtin_basic_rock', minutes: 2, note: 'Shuffle it: same groove, swung 8ths.', settings: { bpm: 92, swing: 60 } },
    ],
  },
  {
    id: 'wk_adv_20',
    name: 'Advanced Shed',
    level: 'advanced',
    minutes: 20,
    description: 'Quads, Flam Beats from Stick Control, drags and stroke rolls — capped with a hard gap-trainer test.',
    blocks: [
      { exerciseId: 'builtin_double_stroke', minutes: 2, note: 'Warm-up ramp, higher cap.', settings: { bpm: 100, ...ramp(4, 5, 140) } },
      { exerciseId: 'sc_sb_13', minutes: 3, note: 'Quads (RRRRLLLL): four even strokes per hand.', settings: { bpm: 80, ...ramp(4, 5, 110) } },
      { exerciseId: 'sc_fb_1', minutes: 3, note: 'Flam Beat 1 — graces tight to the beat.', settings: { bpm: 70, ...ramp(8, 4, 90) } },
      { exerciseId: 'sc_fb_11', minutes: 3, note: 'Flammed doubles — both flams identical.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_single_drag_tap', minutes: 2, note: 'Drags: two graces, one accent.', settings: { bpm: 60, ...ramp(8, 4, 80) } },
      { exerciseId: 'sc_rp_5r', minutes: 3, note: '5-stroke rolls — clean release on the accent.', settings: { bpm: 70 } },
      { exerciseId: 'sc_tr_1', minutes: 2, note: 'Straight 8ths into sextuplets without rushing.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_single_stroke', minutes: 2, note: 'Exam: 1 bar of click, 3 bars alone.', settings: { bpm: 110, ...gap(1, 3) } },
    ],
  },
  {
    id: 'wk_adv_30',
    name: 'Advanced Marathon',
    level: 'advanced',
    minutes: 30,
    description: 'The big one: every hand family ramped, Flam Beat combinations, drags, roll progressions, triplets and swung grooves.',
    blocks: [
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'Long warm-up ramp.', settings: { bpm: 100, ...ramp(4, 5, 150) } },
      { exerciseId: 'builtin_double_stroke', minutes: 3, note: 'Doubles ramp.', settings: { bpm: 100, ...ramp(4, 5, 140) } },
      { exerciseId: 'sc_sb_13', minutes: 3, note: 'Quads ramp.', settings: { bpm: 80, ...ramp(4, 5, 115) } },
      { exerciseId: 'sc_fb_3', minutes: 3, note: 'Alternating flam leads (FRR PLL).', settings: { bpm: 70, ...ramp(8, 4, 92) } },
      { exerciseId: 'sc_fb_24', minutes: 3, note: 'Flam Beat combination — figure change without a hiccup.', settings: { bpm: 70 } },
      { exerciseId: 'builtin_double_drag_tap', minutes: 3, note: 'Double drags in triplet feel.', settings: { bpm: 60, ...ramp(8, 4, 80) } },
      { exerciseId: 'sc_rp_9r', minutes: 3, note: '9-stroke rolls.', settings: { bpm: 72 } },
      { exerciseId: 'sc_tr_3', minutes: 3, note: 'Doubles into sextuplets (Stick Control triplets #3).', settings: { bpm: 72 } },
      { exerciseId: 'builtin_rock_ride', minutes: 3, note: 'Apply it: ride groove, swung.', settings: { bpm: 104, swing: 55 } },
      { exerciseId: 'builtin_single_stroke', minutes: 3, note: 'Final exam: mostly silent click.', settings: { bpm: 120, ...gap(1, 3) } },
    ],
  },
]

// Test helper: every workout must reference real exercises and add up.
export function validateWorkouts(catalog) {
  const ids = new Set(catalog.map((e) => e.id))
  const problems = []
  WORKOUTS.forEach((w) => {
    const sum = w.blocks.reduce((t, b) => t + b.minutes, 0)
    if (sum !== w.minutes) problems.push(`${w.id}: blocks sum ${sum} != ${w.minutes}`)
    w.blocks.forEach((b) => { if (!ids.has(b.exerciseId)) problems.push(`${w.id}: missing exercise ${b.exerciseId}`) })
    if (!['beginner', 'intermediate', 'advanced'].includes(w.level)) problems.push(`${w.id}: bad level`)
  })
  return problems
}
