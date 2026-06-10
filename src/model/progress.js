// Practice journal: minutes per day/exercise, tempo records, streaks.
// Stored under one localStorage key; writes are batched — callers log freely,
// the app flushes every few seconds and on stop/hide.

const KEY = 'drums2_journal'

let cache = null
let dirty = false

function load() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? JSON.parse(raw) : null
  } catch {
    cache = null
  }
  if (!cache || typeof cache !== 'object') cache = { days: {}, tempo: {} }
  cache.days = cache.days || {}
  cache.tempo = cache.tempo || {}
  return cache
}

export function flushJournal() {
  if (!dirty) return
  try { localStorage.setItem(KEY, JSON.stringify(load())) } catch { /* full/unavailable */ }
  dirty = false
}

// Local-timezone YYYY-MM-DD (practice days are the drummer's local days).
export function dayKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function logPracticeSeconds(exId, sec, d = new Date()) {
  if (!exId || !sec) return
  const j = load()
  const k = dayKey(d)
  const day = j.days[k] || (j.days[k] = { seconds: 0, byExercise: {} })
  day.seconds += sec
  day.byExercise[exId] = (day.byExercise[exId] || 0) + sec
  dirty = true
}

const HISTORY_CAP = 60

export function logTempo(exId, bpm, d = new Date()) {
  if (!exId || !bpm) return
  const j = load()
  const t = j.tempo[exId] || (j.tempo[exId] = { best: 0, last: 0, history: [] })
  t.last = bpm
  if (bpm > t.best) t.best = bpm
  const k = dayKey(d)
  const tail = t.history[t.history.length - 1]
  if (tail && tail.d === k) tail.bpm = Math.max(tail.bpm, bpm)
  else t.history.push({ d: k, bpm })
  if (t.history.length > HISTORY_CAP) t.history.splice(0, t.history.length - HISTORY_CAP)
  dirty = true
}

export function getTempoStats(exId) {
  return load().tempo[exId] || null
}

// Consecutive practice days ending today (or yesterday, if today not yet played).
export function getStreak(now = new Date()) {
  const j = load()
  const day = 24 * 60 * 60 * 1000
  let cursor = new Date(now)
  if (!j.days[dayKey(cursor)]?.seconds) cursor = new Date(cursor.getTime() - day)
  let streak = 0
  while (j.days[dayKey(cursor)]?.seconds > 0) {
    streak += 1
    cursor = new Date(cursor.getTime() - day)
  }
  return streak
}

export function getWeekMinutes(now = new Date()) {
  const j = load()
  const day = 24 * 60 * 60 * 1000
  let sec = 0
  for (let i = 0; i < 7; i++) sec += j.days[dayKey(new Date(now.getTime() - i * day))]?.seconds || 0
  return Math.round(sec / 60)
}

// Last `weeks` full weeks of daily seconds, oldest first — heatmap fodder.
export function getDayMap(weeks = 12, now = new Date()) {
  const j = load()
  const day = 24 * 60 * 60 * 1000
  const n = weeks * 7
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * day)
    const k = dayKey(d)
    out.push({ d: k, seconds: j.days[k]?.seconds || 0 })
  }
  return out
}

// Top exercises by practice time over the last `days` days.
export function getRecentExercises(days = 7, now = new Date()) {
  const j = load()
  const ms = 24 * 60 * 60 * 1000
  const sums = {}
  for (let i = 0; i < days; i++) {
    const rec = j.days[dayKey(new Date(now.getTime() - i * ms))]
    if (!rec) continue
    Object.entries(rec.byExercise).forEach(([id, s]) => { sums[id] = (sums[id] || 0) + s })
  }
  return Object.entries(sums)
    .map(([exId, seconds]) => ({ exId, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}

// For whole-library backups.
export function exportJournal() {
  return load()
}

// Merge an imported journal: per-day MAX (re-importing the same backup must not
// double-count), tempo best = max, histories merged per-date by max.
export function mergeJournal(imported) {
  if (!imported || typeof imported !== 'object') return
  const j = load()
  Object.entries(imported.days || {}).forEach(([k, day]) => {
    const cur = j.days[k]
    if (!cur || (day.seconds || 0) > cur.seconds) {
      j.days[k] = { seconds: day.seconds || 0, byExercise: { ...(day.byExercise || {}) } }
    }
  })
  Object.entries(imported.tempo || {}).forEach(([exId, t]) => {
    const cur = j.tempo[exId] || (j.tempo[exId] = { best: 0, last: 0, history: [] })
    cur.best = Math.max(cur.best, t.best || 0)
    if (!cur.last) cur.last = t.last || 0
    const byDate = new Map(cur.history.map((h) => [h.d, h.bpm]))
    ;(t.history || []).forEach((h) => byDate.set(h.d, Math.max(byDate.get(h.d) || 0, h.bpm)))
    cur.history = [...byDate.entries()].map(([d, bpm]) => ({ d, bpm })).sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-HISTORY_CAP)
  })
  dirty = true
  flushJournal()
}

// Tests only: drop the in-memory cache so localStorage is re-read.
export function _resetJournalCache() {
  cache = null
  dirty = false
}
