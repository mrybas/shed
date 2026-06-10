import { describe, it, expect, beforeEach } from 'vitest'
import { loadSetlist, toggleInSetlist, removeFromSetlist, moveInSetlist, clearSetlist } from './setlist.js'

describe('setlist', () => {
  beforeEach(() => localStorage.clear())

  it('toggles, reorders, removes and clears with persistence', () => {
    expect(loadSetlist()).toEqual([])
    toggleInSetlist('a'); toggleInSetlist('b'); toggleInSetlist('c')
    expect(loadSetlist()).toEqual(['a', 'b', 'c'])
    moveInSetlist('c', -1)
    expect(loadSetlist()).toEqual(['a', 'c', 'b'])
    moveInSetlist('a', -1) // already first: no-op
    expect(loadSetlist()).toEqual(['a', 'c', 'b'])
    removeFromSetlist('c')
    expect(loadSetlist()).toEqual(['a', 'b'])
    toggleInSetlist('a') // toggle off
    expect(loadSetlist()).toEqual(['b'])
    clearSetlist()
    expect(loadSetlist()).toEqual([])
  })
})
