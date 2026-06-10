// Setlist — an ordered queue of exercise ids the player runs through manually
// (no timers, unlike workouts).
const KEY = 'drums2_setlist'

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
  return list
}

export function loadSetlist() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function toggleInSetlist(id) {
  const list = loadSetlist()
  return save(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
}

export function removeFromSetlist(id) {
  return save(loadSetlist().filter((x) => x !== id))
}

export function moveInSetlist(id, dir) {
  const list = loadSetlist()
  const i = list.indexOf(id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return save(next)
}

export function clearSetlist() {
  return save([])
}
