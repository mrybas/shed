// Favorite exercises — a plain list of ids in localStorage.
const KEY = 'drums2_favs'

export function loadFavs() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function toggleFav(id) {
  const favs = loadFavs()
  const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
