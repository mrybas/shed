import { describe, it, expect, beforeEach } from 'vitest'
import {
  logPracticeSeconds, logTempo, flushJournal, dayKey,
  getStreak, getWeekMinutes, getDayMap, getRecentExercises, getTempoStats,
  exportJournal, mergeJournal, _resetJournalCache,
} from './progress.js'

const D = (s) => new Date(s + 'T12:00:00')

beforeEach(() => {
  localStorage.clear()
  _resetJournalCache()
})

describe('practice journal', () => {
  it('accumulates seconds per day and per exercise, and survives a flush', () => {
    logPracticeSeconds('ex1', 30, D('2026-06-10'))
    logPracticeSeconds('ex1', 15, D('2026-06-10'))
    logPracticeSeconds('ex2', 60, D('2026-06-10'))
    flushJournal()
    _resetJournalCache()
    const j = exportJournal()
    expect(j.days['2026-06-10'].seconds).toBe(105)
    expect(j.days['2026-06-10'].byExercise).toEqual({ ex1: 45, ex2: 60 })
  })

  it('computes streaks across day boundaries (today optional)', () => {
    logPracticeSeconds('ex1', 60, D('2026-06-08'))
    logPracticeSeconds('ex1', 60, D('2026-06-09'))
    // today (06-10) not yet played -> streak still counts up to yesterday
    expect(getStreak(D('2026-06-10'))).toBe(2)
    logPracticeSeconds('ex1', 60, D('2026-06-10'))
    expect(getStreak(D('2026-06-10'))).toBe(3)
    // gap breaks it
    expect(getStreak(D('2026-06-13'))).toBe(0)
  })

  it('sums week minutes over the last 7 days only', () => {
    logPracticeSeconds('ex1', 600, D('2026-06-10')) // 10 min
    logPracticeSeconds('ex1', 300, D('2026-06-05')) // 5 min (within 7d)
    logPracticeSeconds('ex1', 6000, D('2026-05-20')) // old, ignored
    expect(getWeekMinutes(D('2026-06-10'))).toBe(15)
  })

  it('tempo records: best, last, one history point per day, capped', () => {
    logTempo('ex1', 100, D('2026-06-09'))
    logTempo('ex1', 120, D('2026-06-10'))
    logTempo('ex1', 110, D('2026-06-10')) // same day, lower -> keeps 120
    const t = getTempoStats('ex1')
    expect(t.best).toBe(120)
    expect(t.last).toBe(110)
    expect(t.history).toEqual([{ d: '2026-06-09', bpm: 100 }, { d: '2026-06-10', bpm: 120 }])
    for (let i = 0; i < 70; i++) logTempo('ex1', 90 + i, new Date(D('2026-06-11').getTime() + i * 86400000))
    expect(getTempoStats('ex1').history.length).toBeLessThanOrEqual(60)
  })

  it('day map covers weeks*7 days oldest-first', () => {
    logPracticeSeconds('ex1', 60, D('2026-06-10'))
    const map = getDayMap(2, D('2026-06-10'))
    expect(map).toHaveLength(14)
    expect(map[13]).toEqual({ d: '2026-06-10', seconds: 60 })
  })

  it('recent exercises ranked by time', () => {
    logPracticeSeconds('a', 30, D('2026-06-10'))
    logPracticeSeconds('b', 90, D('2026-06-09'))
    expect(getRecentExercises(7, D('2026-06-10'))).toEqual([
      { exId: 'b', seconds: 90 },
      { exId: 'a', seconds: 30 },
    ])
  })

  it('merge takes per-day max (re-import is idempotent) and max tempo', () => {
    logPracticeSeconds('ex1', 100, D('2026-06-10'))
    logTempo('ex1', 100, D('2026-06-10'))
    flushJournal()
    const backup = JSON.parse(JSON.stringify(exportJournal()))
    mergeJournal(backup) // re-import same backup
    expect(exportJournal().days['2026-06-10'].seconds).toBe(100) // not doubled
    mergeJournal({ days: { '2026-06-10': { seconds: 500, byExercise: { ex9: 500 } } }, tempo: { ex1: { best: 140, last: 140, history: [{ d: '2026-06-01', bpm: 140 }] } } })
    expect(exportJournal().days['2026-06-10'].seconds).toBe(500) // bigger wins
    expect(getTempoStats('ex1').best).toBe(140)
    expect(getTempoStats('ex1').history[0]).toEqual({ d: '2026-06-01', bpm: 140 })
  })

  it('dayKey uses the local timezone', () => {
    expect(dayKey(D('2026-06-10'))).toBe('2026-06-10')
  })
})
