import { useRef, useCallback } from 'react'

// Tap tempo: average the intervals of taps within a rolling 2.2s window and
// report the resulting BPM (clamped to a sane range) via onBpm.
export function useTapTempo(onBpm) {
  const tapsRef = useRef([])
  return useCallback(() => {
    const now = performance.now()
    const arr = tapsRef.current.filter((x) => now - x < 2200)
    arr.push(now)
    tapsRef.current = arr
    if (arr.length >= 2) {
      const deltas = arr.slice(1).map((x, i) => x - arr[i])
      const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
      const bpm = Math.round(60000 / avg)
      if (bpm >= 30 && bpm <= 300) onBpm(bpm)
    }
  }, [onBpm])
}
