import { describe, it, expect } from 'vitest'
import { GUIDE, searchGuide } from './guide.js'
import { CHANGELOG, entriesSince } from './changelog.js'
import fs from 'node:fs'

describe('guide content', () => {
  it('sections are well-formed with unique ids and non-empty items', () => {
    const ids = GUIDE.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    GUIDE.forEach((sec) => {
      expect(sec.title.length).toBeGreaterThan(0)
      expect(sec.items.length).toBeGreaterThan(0)
      sec.items.forEach((item) => {
        expect(item.title.length).toBeGreaterThan(0)
        expect(item.body.length).toBeGreaterThan(40) // real explanations, not stubs
      })
    })
  })

  it('every referenced image exists in public/guide', () => {
    GUIDE.flatMap((s) => s.items).forEach((item) => {
      if (item.img) {
        expect(fs.existsSync(`public/guide/${item.img}.webp`), item.img).toBe(true)
      }
    })
  })

  it('search finds items across sections and is empty for no query', () => {
    expect(searchGuide('')).toEqual([])
    const hits = searchGuide('polyrhythm')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].section.id).toBe('metronome')
    expect(searchGuide('zzz-not-there')).toEqual([])
  })
})

describe('changelog', () => {
  it('guide deep links point at real sections', () => {
    const ids = new Set(GUIDE.map((s) => s.id))
    CHANGELOG.flatMap((e) => e.items).forEach((item) => {
      if (item.guide) expect(ids.has(item.guide), item.guide).toBe(true)
    })
  })

  it('entriesSince returns only strictly newer entries', () => {
    expect(entriesSince('v5.32').every((e) => e.version > 'v5.32')).toBe(true)
    expect(entriesSince('v5.14').length).toBe(CHANGELOG.length)
    expect(entriesSince(CHANGELOG[0].version)).toEqual([])
    expect(entriesSince(null)).toEqual([])
    expect(entriesSince('garbage')).toEqual([])
  })
})
