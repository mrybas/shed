import { describe, it, expect } from 'vitest'
import { filterExercises, groupExercises } from './catalog.js'

const mk = (over) => ({
  id: over.id, name: over.name || over.id, subdivision: over.subdivision || 'sixteenth',
  timeSignature: { beats: 4, unit: 4 }, sticking: (over.sticking || '').split(''),
  source: over.source || 'user', section: over.section || 'other', number: over.number ?? null,
  tags: over.tags || [],
})

const sample = [
  mk({ id: 'a', name: 'Alpha', source: 'stick-control', section: 'single-beat', number: 2, tags: ['doubles'], sticking: 'RRLL' }),
  mk({ id: 'b', name: 'Beta', source: 'stick-control', section: 'single-beat', number: 1, tags: ['singles'], sticking: 'RLRL' }),
  mk({ id: 'c', name: 'Para', source: 'drumeo', section: 'paradiddle', subdivision: 'triplet', tags: ['rudiment'] }),
  mk({ id: 'd', name: 'Mine', source: 'user', section: 'other', tags: [] }),
]

describe('filterExercises', () => {
  it('filters by subdivision', () => {
    expect(filterExercises(sample, { subdivision: 'triplet' }).map((e) => e.id)).toEqual(['c'])
  })
  it('filters by tag', () => {
    expect(filterExercises(sample, { tag: 'doubles' }).map((e) => e.id)).toEqual(['a'])
  })
  it('searches by name, number and sticking', () => {
    expect(filterExercises(sample, { query: 'beta' }).map((e) => e.id)).toEqual(['b'])
    expect(filterExercises(sample, { query: '2' }).map((e) => e.id)).toEqual(['a'])
    expect(filterExercises(sample, { query: 'rrll' }).map((e) => e.id)).toEqual(['a'])
  })
  it('returns all when no filters', () => {
    expect(filterExercises(sample, {})).toHaveLength(4)
  })
})

describe('groupExercises', () => {
  it('orders sources and sorts exercises by number', () => {
    const groups = groupExercises(sample)
    expect(groups.map((g) => g.source)).toEqual(['stick-control', 'drumeo', 'user'])
    const sc = groups[0]
    expect(sc.count).toBe(2)
    expect(sc.sections[0].exercises.map((e) => e.id)).toEqual(['b', 'a']) // #1 before #2
  })
})
