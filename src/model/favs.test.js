import { describe, it, expect, beforeEach } from 'vitest'
import { loadFavs, toggleFav } from './favs.js'

describe('favorites', () => {
  beforeEach(() => localStorage.clear())

  it('starts empty and toggles ids on/off with persistence', () => {
    expect(loadFavs()).toEqual([])
    expect(toggleFav('a')).toEqual(['a'])
    expect(toggleFav('b')).toEqual(['a', 'b'])
    expect(loadFavs()).toEqual(['a', 'b'])
    expect(toggleFav('a')).toEqual(['b'])
    expect(loadFavs()).toEqual(['b'])
  })

  it('survives corrupted storage', () => {
    localStorage.setItem('drums2_favs', '{oops')
    expect(loadFavs()).toEqual([])
  })
})
