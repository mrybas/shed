// Grouping + filtering for the exercise library (pure, unit-testable).

export const SOURCE_ORDER = ['stick-control', 'drumeo', 'basics', 'user']

function sourceRank(s) {
  const i = SOURCE_ORDER.indexOf(s)
  return i === -1 ? SOURCE_ORDER.length : i
}

// Filter by free-text query (name / number / sticking), subdivision and tag.
export function filterExercises(list, { query = '', subdivision = 'all', tag = 'all' } = {}) {
  const q = query.trim().toLowerCase()
  return list.filter((ex) => {
    if (subdivision !== 'all' && ex.subdivision !== subdivision) return false
    if (tag !== 'all' && !(ex.tags || []).includes(tag)) return false
    if (!q) return true
    const sticking = (ex.sticking || []).join('').toLowerCase()
    return (
      ex.name.toLowerCase().includes(q) ||
      String(ex.number ?? '').includes(q) ||
      sticking.includes(q.replace(/\s+/g, ''))
    )
  })
}

// Group exercises into source -> section, preserving a stable display order.
export function groupExercises(list) {
  const bySource = new Map()
  list.forEach((ex) => {
    const src = ex.source || 'user'
    if (!bySource.has(src)) bySource.set(src, new Map())
    const sections = bySource.get(src)
    const sec = ex.section || 'other'
    if (!sections.has(sec)) sections.set(sec, [])
    sections.get(sec).push(ex)
  })

  const sources = [...bySource.entries()].sort((a, b) => sourceRank(a[0]) - sourceRank(b[0]))
  return sources.map(([source, sections]) => ({
    source,
    sections: [...sections.entries()].map(([section, exercises]) => ({
      section,
      exercises: exercises.slice().sort((a, b) => {
        if (a.number != null && b.number != null) return a.number - b.number
        return a.name.localeCompare(b.name)
      }),
    })),
    count: [...sections.values()].reduce((n, arr) => n + arr.length, 0),
  }))
}
