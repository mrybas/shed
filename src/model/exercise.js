// Exercise data model + serialization + localStorage library.

// Instruments available as sequencer rows (key -> drum voice in drumSynths).
export const INSTRUMENTS = [
  'crash',
  'ride',
  'hihatOpen',
  'hihatClosed',
  'snare',
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

export function exerciseTotalSteps(ex) {
  return getBeatSubs(ex).reduce((n, sub) => n + stepsPerBeat(sub), 0)
}

function makeCell() {
  return { on: false, accent: false, roll: 0 }
}

function makeRow(n) {
  return Array.from({ length: n }, makeCell)
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
  const beatSubs = opts.beatSubs || Array.from({ length: timeSignature.beats }, () => subdivision)
  const n = beatSubs.reduce((t, s) => t + stepsPerBeat(s), 0)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    rows[key] = makeRow(n)
  })
  return {
    version: 1,
    app: 'drums',
    id: opts.id || genId(),
    name: opts.name || 'New exercise',
    bpm: opts.bpm || 90,
    timeSignature,
    subdivision,
    beatSubs,
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
        if (c) row[nr.start + i] = { on: !!c.on, accent: !!c.accent, roll: c.roll || 0 }
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

// Change the time signature and apply one uniform subdivision to all beats.
export function resizeExercise(ex, timeSignature, subdivision) {
  const beatSubs = Array.from({ length: timeSignature.beats }, () => subdivision)
  return rebuild(ex, timeSignature, beatSubs)
}

// Change the subdivision of a single beat (keeps the others).
export function setBeatSub(ex, beatIndex, subdivision) {
  const beatSubs = getBeatSubs(ex).slice()
  beatSubs[beatIndex] = subdivision
  return rebuild(ex, ex.timeSignature, beatSubs)
}

// ---- Serialization ----

export function exportExercise(ex) {
  const data = JSON.stringify(ex, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safe = ex.name.replace(/[^\w\-а-яіїєґ ]/gi, '').trim().replace(/\s+/g, '_') || 'exercise'
  a.href = url
  a.download = `${safe}.drums.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function parseImported(text) {
  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON')
  }
  if (!obj || obj.app !== 'drums' || !obj.rows || !obj.timeSignature) {
    throw new Error('Not a valid drums exercise file')
  }
  // Normalize: per-beat subdivisions (fall back to uniform), then row lengths.
  const subdivision = obj.subdivision || 'sixteenth'
  const beatSubs = Array.isArray(obj.beatSubs) && obj.beatSubs.length === obj.timeSignature.beats
    ? obj.beatSubs
    : Array.from({ length: obj.timeSignature.beats }, () => subdivision)
  const n = beatSubs.reduce((t, s) => t + stepsPerBeat(s), 0)
  const rows = {}
  INSTRUMENTS.forEach((key) => {
    const old = obj.rows[key] || []
    rows[key] = Array.from({ length: n }, (_, i) => {
      const c = old[i]
      return c ? { on: !!c.on, accent: !!c.accent, roll: c.roll || 0 } : { on: false, accent: false, roll: 0 }
    })
  })
  return {
    version: 1,
    app: 'drums',
    id: genId(),
    name: obj.name || 'Imported',
    bpm: obj.bpm || 90,
    timeSignature: obj.timeSignature,
    subdivision,
    beatSubs,
    instruments: [...INSTRUMENTS],
    rows,
    sticking: Array.from({ length: n }, (_, i) => obj.sticking?.[i] || ''),
    source: obj.source || 'user',
    section: obj.section || null,
    number: obj.number ?? null,
    page: obj.page ?? null,
    tags: Array.isArray(obj.tags) ? obj.tags : [],
  }
}

// ---- localStorage library ----

const LS_KEY = 'drums.library'

export function loadLibrary() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveToLibrary(ex) {
  const lib = loadLibrary()
  const idx = lib.findIndex((e) => e.id === ex.id)
  if (idx >= 0) lib[idx] = ex
  else lib.push(ex)
  localStorage.setItem(LS_KEY, JSON.stringify(lib))
  return lib
}

export function deleteFromLibrary(id) {
  const lib = loadLibrary().filter((e) => e.id !== id)
  localStorage.setItem(LS_KEY, JSON.stringify(lib))
  return lib
}

export { genId }
