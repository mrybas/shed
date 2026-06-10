// Exercise data model + serialization + localStorage library.

// Instruments available as sequencer rows (key -> drum voice in drumSynths).
export const INSTRUMENTS = [
  'crash',
  'ride',
  'hihatOpen',
  'hihatClosed',
  'tom1',
  'tom2',
  'snare',
  'floorTom',
  'kick',
]

// Subdivision = steps per beat. Labels describe the feel relative to one beat.
export const SUBDIVISIONS = {
  quarter: 1,
  eighth: 2,
  triplet: 3,
  sixteenth: 4,
  sextuplet: 6,
  thirtysecond: 8,
}

export function stepsPerBeat(subdivision) {
  return SUBDIVISIONS[subdivision] || 1
}
// Alias — reads clearer when working per beat.
export const stepsForBeat = stepsPerBeat

export function totalSteps(timeSignature, subdivision) {
  return timeSignature.beats * stepsPerBeat(subdivision)
}

// Per-beat subdivisions. Falls back to a uniform `subdivision` for older exercises.
export function getBeatSubs(ex) {
  if (Array.isArray(ex.beatSubs) && ex.beatSubs.length === ex.timeSignature.beats) return ex.beatSubs
  return Array.from({ length: ex.timeSignature.beats }, () => ex.subdivision || 'sixteenth')
}

// Step layout of an exercise: one entry per beat with its start offset + length.
export function beatRanges(ex) {
  const subs = getBeatSubs(ex)
  const ranges = []
  let start = 0
  subs.forEach((sub, beat) => {
    const len = stepsPerBeat(sub)
    ranges.push({ beat, start, len, sub })
    start += len
  })
  return ranges
}

// ---- Bars (multi-bar exercises) ----
// Single-bar exercises keep their flat `timeSignature` + `beatSubs` (and have no
// `bars` field). Multi-bar exercises carry `ex.bars = [{ ts, beatSubs }, ...]`
// as the source of truth, with `rows`/`sticking` flat across all bars. `getBars`
// hides the difference: everything downstream reads bars through it.
function normalizeBarSpec(b, fallbackSub = 'sixteenth') {
  const ts = b?.ts && b.ts.beats ? { beats: b.ts.beats, unit: b.ts.unit || 4 } : { beats: 4, unit: 4 }
  const seed = (Array.isArray(b?.beatSubs) && b.beatSubs[0]) || fallbackSub
  const beatSubs = Array.isArray(b?.beatSubs) && b.beatSubs.length === ts.beats
    ? b.beatSubs.slice()
    : Array.from({ length: ts.beats }, (_, i) => b?.beatSubs?.[i] || seed)
  return { ts, beatSubs }
}

export function getBars(ex) {
  if (Array.isArray(ex.bars) && ex.bars.length) {
    return ex.bars.map((b) => normalizeBarSpec(b, ex.subdivision))
  }
  return [{ ts: ex.timeSignature, beatSubs: getBeatSubs(ex) }]
}

export function barCount(ex) {
  return getBars(ex).length
}

// Positional layout across all bars: per-bar step ranges + per-beat ranges with
// global indices. The one function the engine/notation/editor use to place steps.
export function barLayout(ex) {
  const bars = getBars(ex)
  let step = 0
  let globalBeat = 0
  const layoutBars = bars.map((b, bar) => {
    const startStep = step
    const beats = b.beatSubs.map((sub, beatInBar) => {
      const len = stepsPerBeat(sub)
      const entry = { bar, beatInBar, globalBeat, start: step, len, sub }
      step += len
      globalBeat += 1
      return entry
    })
    return { bar, ts: b.ts, beatSubs: b.beatSubs, startStep, stepCount: step - startStep, beats }
  })
  return { bars: layoutBars, totalSteps: step }
}

export function exerciseTotalSteps(ex) {
  return barLayout(ex).totalSteps
}

// Write a bars array back onto an exercise, keeping legacy fields in sync with
// bar 0. Single-bar collapses to the flat shape (no `bars`) for back-compat.
function withBars(ex, bars) {
  const norm = bars.map((b) => normalizeBarSpec(b, ex.subdivision))
  const base = {
    ...ex,
    timeSignature: norm[0].ts,
    beatSubs: norm[0].beatSubs,
    subdivision: norm[0].beatSubs[0],
  }
  if (norm.length > 1) base.bars = norm
  else delete base.bars
  return base
}

// Copy cells/sticking from an old bar's step range into a new one, matching by
// beat index and position-within-beat (the same rule as single-bar rebuild).
function rebuildBarRange(ex, oldRange, oldSpec, newSpec) {
  const { ranges: newR, total: newCount } = rangesFor(newSpec.ts, newSpec.beatSubs)
  const { ranges: oldR } = rangesFor(oldSpec.ts, oldSpec.beatSubs)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const row = ex.rows[key] || []
    const before = row.slice(0, oldRange.start)
    const after = row.slice(oldRange.start + oldRange.count)
    const mid = makeRow(newCount)
    newR.forEach((nr, b) => {
      const or = oldR[b]
      if (!or) return
      const copy = Math.min(or.len, nr.len)
      for (let i = 0; i < copy; i++) {
        const c = row[oldRange.start + or.start + i]
        if (c) mid[nr.start + i] = copyCell(c)
      }
    })
    rows[key] = [...before, ...mid, ...after]
  })
  const sBefore = ex.sticking.slice(0, oldRange.start)
  const sAfter = ex.sticking.slice(oldRange.start + oldRange.count)
  const sMid = Array.from({ length: newCount }, () => '')
  newR.forEach((nr, b) => {
    const or = oldR[b]
    if (!or) return
    const copy = Math.min(or.len, nr.len)
    for (let i = 0; i < copy; i++) sMid[nr.start + i] = ex.sticking[oldRange.start + or.start + i] || ''
  })
  return { rows, sticking: [...sBefore, ...sMid, ...sAfter] }
}

// Replace bar `i`'s meter/subdivisions, preserving its cells by position and
// leaving every other bar untouched.
function replaceBar(ex, i, newSpec) {
  const layout = barLayout(ex)
  const bars = getBars(ex)
  const lb = layout.bars[i]
  if (!lb) return ex
  const spec = normalizeBarSpec(newSpec, ex.subdivision)
  const { rows, sticking } = rebuildBarRange(
    ex,
    { start: lb.startStep, count: lb.stepCount },
    { ts: lb.ts, beatSubs: lb.beatSubs },
    spec,
  )
  const next = bars.slice()
  next[i] = spec
  return { ...withBars({ ...ex, rows, sticking }, next) }
}

// Insert a bar at position `index` (0..bars.length). The meter/subdivisions
// default to a full copy of the neighbouring bar's (the bar currently at that
// position, or the last bar when appending); cells start empty unless
// `opts.cells` provides pre-filled `{ rows, sticking }` slices (duplicateBar).
export function insertBar(ex, index, opts = {}) {
  const bars = getBars(ex)
  const layout = barLayout(ex)
  const i = Math.max(0, Math.min(index, bars.length))
  const neighbour = bars[Math.min(i, bars.length - 1)]
  const spec = normalizeBarSpec(opts.bar || { ts: neighbour.ts, beatSubs: neighbour.beatSubs.slice() }, ex.subdivision)
  const count = spec.beatSubs.reduce((t, s) => t + stepsPerBeat(s), 0)
  const at = i < layout.bars.length ? layout.bars[i].startStep : layout.totalSteps
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const row = ex.rows[key] || []
    const mid = opts.cells ? opts.cells.rows[key].map(copyCell) : makeRow(count)
    rows[key] = [...row.slice(0, at), ...mid, ...row.slice(at)]
  })
  const midStick = opts.cells ? opts.cells.sticking.slice() : Array.from({ length: count }, () => '')
  const sticking = [...ex.sticking.slice(0, at), ...midStick, ...ex.sticking.slice(at)]
  const next = bars.slice()
  next.splice(i, 0, spec)
  return withBars({ ...ex, rows, sticking }, next)
}

// Append a bar at the end (full copy of the last bar's meter, empty cells).
export function addBar(ex, opts = {}) {
  return insertBar(ex, getBars(ex).length, opts)
}

// Insert an exact copy of bar `index` (meter + cells + sticking) right after it.
export function duplicateBar(ex, index) {
  const layout = barLayout(ex)
  const lb = layout.bars[index]
  if (!lb) return ex
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    rows[key] = (ex.rows[key] || []).slice(lb.startStep, lb.startStep + lb.stepCount)
  })
  const sticking = ex.sticking.slice(lb.startStep, lb.startStep + lb.stepCount)
  return insertBar(ex, index + 1, { bar: { ts: lb.ts, beatSubs: lb.beatSubs.slice() }, cells: { rows, sticking } })
}

// Remove bar `i` (its step range is spliced out). Keeps at least one bar.
export function removeBar(ex, i) {
  const layout = barLayout(ex)
  if (layout.bars.length <= 1) return ex
  const lb = layout.bars[i]
  if (!lb) return ex
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const row = ex.rows[key] || []
    rows[key] = [...row.slice(0, lb.startStep), ...row.slice(lb.startStep + lb.stepCount)]
  })
  const sticking = [...ex.sticking.slice(0, lb.startStep), ...ex.sticking.slice(lb.startStep + lb.stepCount)]
  const bars = getBars(ex).filter((_, idx) => idx !== i)
  return withBars({ ...ex, rows, sticking }, bars)
}

// Change one bar's time signature (preserves overlapping beats/cells).
export function setBarTimeSignature(ex, i, ts) {
  const bars = getBars(ex)
  const cur = bars[i]
  if (!cur) return ex
  const seed = cur.beatSubs[0] || 'sixteenth'
  const beatSubs = Array.from({ length: ts.beats }, (_, k) => cur.beatSubs[k] || seed)
  return replaceBar(ex, i, { ts: { beats: ts.beats, unit: ts.unit || 4 }, beatSubs })
}

function makeCell() {
  return { on: false, accent: false, roll: 0 }
}

function makeRow(n) {
  return Array.from({ length: n }, makeCell)
}

// Normalize a cell, preserving the optional `flam`/`ghost` flags only when set
// (so empty cells keep their minimal { on, accent, roll } shape).
// flam is `true` (one grace stroke) or 'drag' (two grace strokes / ruff).
function copyCell(c) {
  if (!c) return { on: false, accent: false, roll: 0 }
  const nc = { on: !!c.on, accent: !!c.accent, roll: c.roll || 0 }
  if (c.flam) nc.flam = c.flam === 'drag' ? 'drag' : true
  if (c.ghost) nc.ghost = true
  return nc
}

let counter = 0
function genId() {
  // Avoids Date.now()/Math.random reliance for determinism concerns elsewhere;
  // here uniqueness within a session is enough.
  counter += 1
  return `ex_${counter}_${performance.now().toString(36).replace('.', '')}`
}

export function createEmptyExercise(opts = {}) {
  const timeSignature = opts.timeSignature || { beats: 4, unit: 4 }
  const subdivision = opts.subdivision || 'sixteenth'
  const barsSpec = Array.isArray(opts.bars) && opts.bars.length
    ? opts.bars.map((b) => normalizeBarSpec(b, subdivision))
    : null
  const beatSubs = opts.beatSubs || Array.from({ length: timeSignature.beats }, () => subdivision)
  const n = barsSpec
    ? barsSpec.reduce((t, b) => t + b.beatSubs.reduce((s, sub) => s + stepsPerBeat(sub), 0), 0)
    : beatSubs.reduce((t, s) => t + stepsPerBeat(s), 0)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    rows[key] = makeRow(n)
  })
  const ex = {
    version: 1,
    app: 'drums',
    id: opts.id || genId(),
    name: opts.name || 'New exercise',
    bpm: opts.bpm || 90,
    timeSignature: barsSpec ? barsSpec[0].ts : timeSignature,
    subdivision: barsSpec ? barsSpec[0].beatSubs[0] : subdivision,
    beatSubs: barsSpec ? barsSpec[0].beatSubs : beatSubs,
    instruments: [...INSTRUMENTS],
    rows,
    sticking: Array.from({ length: n }, () => ''),
    // Catalog metadata (optional): source, section, number, page, tags.
    source: opts.source || 'user',
    section: opts.section || null,
    number: opts.number ?? null,
    page: opts.page ?? null,
    tags: opts.tags || [],
  }
  if (opts.level) ex.level = opts.level // beginner | intermediate | advanced
  if (barsSpec && barsSpec.length > 1) ex.bars = barsSpec
  return ex
}

// Classify a sticking string by its longest run of the same hand:
// 1 = singles, 2 = doubles, 3 = triples, 4+ = quads.
export function strokeTypeTag(sticking) {
  const s = sticking.replace(/[^RL]/gi, '').toUpperCase()
  if (!s) return 'mixed'
  let max = 1
  let run = 1
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) { run++; if (run > max) max = run } else { run = 1 }
  }
  return max >= 4 ? 'quads' : max === 3 ? 'triples' : max === 2 ? 'doubles' : 'singles'
}

function rangesFor(timeSignature, beatSubs) {
  const ranges = []
  let start = 0
  for (let b = 0; b < timeSignature.beats; b++) {
    const len = stepsPerBeat(beatSubs[b])
    ranges.push({ start, len })
    start += len
  }
  return { ranges, total: start }
}

// Rebuild rows for new time signature / per-beat subdivisions, preserving cells
// position-within-beat where the layout overlaps.
function rebuild(ex, timeSignature, beatSubs) {
  const { ranges: newR, total: n } = rangesFor(timeSignature, beatSubs)
  const oldR = beatRanges(ex)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const oldRow = ex.rows[key] || []
    const row = makeRow(n)
    newR.forEach((nr, b) => {
      const or = oldR[b]
      if (!or) return
      const copy = Math.min(or.len, nr.len)
      for (let i = 0; i < copy; i++) {
        const c = oldRow[or.start + i]
        if (c) row[nr.start + i] = copyCell(c)
      }
    })
    rows[key] = row
  })
  const sticking = Array.from({ length: n }, () => '')
  newR.forEach((nr, b) => {
    const or = oldR[b]
    if (!or) return
    const copy = Math.min(or.len, nr.len)
    for (let i = 0; i < copy; i++) sticking[nr.start + i] = ex.sticking[or.start + i] || ''
  })
  return { ...ex, timeSignature, beatSubs, subdivision: beatSubs[0], rows, sticking }
}

// Change the time signature and apply one uniform subdivision to all beats. For
// multi-bar exercises this applies to every bar (the "all bars" control).
export function resizeExercise(ex, timeSignature, subdivision) {
  if (Array.isArray(ex.bars) && ex.bars.length) {
    const uniform = { ts: timeSignature, beatSubs: Array.from({ length: timeSignature.beats }, () => subdivision) }
    let out = ex
    for (let i = 0; i < ex.bars.length; i++) out = replaceBar(out, i, uniform)
    return out
  }
  const beatSubs = Array.from({ length: timeSignature.beats }, () => subdivision)
  return rebuild(ex, timeSignature, beatSubs)
}

// Apply one subdivision to every beat of every bar, KEEPING each bar's own
// time signature (unlike resizeExercise, which also rewrites the meter).
export function setAllBeatSubs(ex, subdivision) {
  const bars = getBars(ex)
  let out = ex
  for (let i = 0; i < bars.length; i++) {
    out = replaceBar(out, i, {
      ts: bars[i].ts,
      beatSubs: Array.from({ length: bars[i].ts.beats }, () => subdivision),
    })
  }
  return out
}

// Change the subdivision of a single beat (global beat index), keeping others.
export function setBeatSub(ex, beatIndex, subdivision) {
  if (Array.isArray(ex.bars) && ex.bars.length) {
    const layout = barLayout(ex)
    let target = null
    layout.bars.forEach((lb) => lb.beats.forEach((bt) => { if (bt.globalBeat === beatIndex) target = bt }))
    if (!target) return ex
    const bars = getBars(ex)
    const beatSubs = bars[target.bar].beatSubs.slice()
    beatSubs[target.beatInBar] = subdivision
    return replaceBar(ex, target.bar, { ts: bars[target.bar].ts, beatSubs })
  }
  const beatSubs = getBeatSubs(ex).slice()
  beatSubs[beatIndex] = subdivision
  return rebuild(ex, ex.timeSignature, beatSubs)
}

// ---- Serialization ----

export function downloadJSON(text, filename) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportExercise(ex) {
  const safe = ex.name.replace(/[^\w\-а-яіїєґ ]/gi, '').trim().replace(/\s+/g, '_') || 'exercise'
  downloadJSON(JSON.stringify(ex, null, 2), `${safe}.drums.json`)
}

// Back up the whole saved library (plus optional extras, e.g. the practice
// journal) as one file.
export function exportLibraryFile(extra = {}) {
  const lib = loadLibrary()
  downloadJSON(
    JSON.stringify({ app: 'drums', type: 'library', version: 1, exercises: lib, ...extra }, null, 2),
    'shed-library.drums.json',
  )
  return lib.length
}

// Parse an exported file: either a single exercise, or a whole-library backup
// ({ type: 'library', exercises: [...] }) — the latter returns
// { type: 'library', exercises } with each exercise normalized + re-id'd.
export function parseImported(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON')
  }
  if (obj && obj.app === 'drums' && obj.type === 'library' && Array.isArray(obj.exercises)) {
    return { type: 'library', exercises: obj.exercises.map(parseOne), journal: obj.journal || null, myWorkouts: Array.isArray(obj.myWorkouts) ? obj.myWorkouts : null }
  }
  if (obj && obj.app === 'drums' && obj.type === 'workout' && obj.workout && Array.isArray(obj.workout.blocks)) {
    return { type: 'workout', workout: obj.workout }
  }
  return parseOne(obj)
}

function parseOne(obj) {
  if (!obj || obj.app !== 'drums' || !obj.rows || !obj.timeSignature) {
    throw new Error('Not a valid drums exercise file')
  }
  // Normalize: per-beat subdivisions (fall back to uniform), then row lengths.
  const subdivision = obj.subdivision || 'sixteenth'
  const barsSpec = Array.isArray(obj.bars) && obj.bars.length
    ? obj.bars.map((b) => normalizeBarSpec(b, subdivision))
    : null
  const beatSubs = Array.isArray(obj.beatSubs) && obj.beatSubs.length === obj.timeSignature.beats
    ? obj.beatSubs
    : Array.from({ length: obj.timeSignature.beats }, () => subdivision)
  const n = barsSpec
    ? barsSpec.reduce((t, b) => t + b.beatSubs.reduce((s, sub) => s + stepsPerBeat(sub), 0), 0)
    : beatSubs.reduce((t, s) => t + stepsPerBeat(s), 0)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const old = obj.rows[key] || []
    rows[key] = Array.from({ length: n }, (_, i) => {
      const c = old[i]
      return copyCell(c)
    })
  })
  const ex = {
    version: 1,
    app: 'drums',
    id: genId(),
    name: obj.name || 'Imported',
    bpm: obj.bpm || 90,
    timeSignature: barsSpec ? barsSpec[0].ts : obj.timeSignature,
    subdivision: barsSpec ? barsSpec[0].beatSubs[0] : subdivision,
    beatSubs: barsSpec ? barsSpec[0].beatSubs : beatSubs,
    instruments: [...INSTRUMENTS],
    rows,
    sticking: Array.from({ length: n }, (_, i) => obj.sticking?.[i] || ''),
    source: obj.source || 'user',
    section: obj.section || null,
    number: obj.number ?? null,
    page: obj.page ?? null,
    tags: Array.isArray(obj.tags) ? obj.tags : [],
  }
  if (obj.level) ex.level = obj.level
  if (barsSpec && barsSpec.length > 1) ex.bars = barsSpec
  return ex
}

// Ensure an exercise has rows for every current instrument (older saves predate
// the toms) and that row/sticking lengths match the bar layout. Preserves cells.
export function normalizeExercise(ex) {
  if (!ex || !ex.rows) return ex
  const n = exerciseTotalSteps(ex)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const row = ex.rows[key] || []
    rows[key] = Array.from({ length: n }, (_, i) => {
      const c = row[i]
      return copyCell(c)
    })
  })
  const sticking = Array.from({ length: n }, (_, i) => ex.sticking?.[i] || '')
  return { ...ex, instruments: [...INSTRUMENTS], rows, sticking }
}

// ---- localStorage library ----

const LS_KEY = 'drums.library'

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const lib = raw ? JSON.parse(raw) : []
    return Array.isArray(lib) ? lib.map(normalizeExercise) : []
  } catch {
    return []
  }
}

export function saveToLibrary(ex) {
  const lib = loadLibrary()
  const idx = lib.findIndex((e) => e.id === ex.id)
  if (idx >= 0) lib[idx] = ex
  else lib.push(ex)
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lib))
    return lib
  } catch {
    return null // quota exceeded / storage unavailable
  }
}

export function deleteFromLibrary(id) {
  const lib = loadLibrary().filter((e) => e.id !== id)
  localStorage.setItem(LS_KEY, JSON.stringify(lib))
  return lib
}

export { genId }
