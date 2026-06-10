import { useRef, useState, useEffect, useCallback } from 'react'
import { Scheduler } from '../audio/Scheduler.js'
import { resumeAudio } from '../audio/AudioEngine.js'

// React wrapper around the Scheduler. Holds one Scheduler instance for the
// component's lifetime, drives a visual playhead via requestAnimationFrame,
// and exposes live setters that mutate the scheduler in place.
export function useScheduler(initial = {}) {
  const ref = useRef(null)
  if (!ref.current) {
    ref.current = new Scheduler()
    Object.assign(ref.current, initial)
  }
  const sched = ref.current

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [liveBpm, setLiveBpm] = useState(sched.baseBpm)
  const [gapMuted, setGapMuted] = useState(false)
  const [countingIn, setCountingIn] = useState(false)
  const rafRef = useRef(null)

  const loop = useCallback(() => {
    const s = ref.current
    if (!s.isPlaying) return
    const step = s.visualStep()
    const ci = s.inCountIn()
    // During a count-in the playhead must clear (otherwise "count-in each
    // repeat" leaves the highlight stuck on the last played step).
    if (ci) setCurrentStep(-1)
    else if (step >= 0) setCurrentStep(step)
    const b = Math.round(s.bpm)
    setLiveBpm((prev) => (prev !== b ? b : prev))
    const m = s.metronomeMuted()
    setGapMuted((prev) => (prev !== m ? m : prev))
    setCountingIn((prev) => (prev !== ci ? ci : prev))
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // Keep the screen awake while playing (drummers' hands are busy). The lock is
  // lost whenever the page is hidden — re-acquire on return if still playing.
  const wakeRef = useRef(null)
  const acquireWake = useCallback(async () => {
    try { wakeRef.current = await navigator.wakeLock?.request('screen') } catch { /* unsupported / denied */ }
  }, [])
  const releaseWake = useCallback(() => {
    try { wakeRef.current?.release() } catch { /* ignore */ }
    wakeRef.current = null
  }, [])
  useEffect(() => {
    const onVis = () => { if (!document.hidden && ref.current.isPlaying) acquireWake() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [acquireWake])

  const start = useCallback(async () => {
    await resumeAudio()
    sched.start()
    setIsPlaying(true)
    acquireWake()
    rafRef.current = requestAnimationFrame(loop)
  }, [sched, loop, acquireWake])

  const stop = useCallback(() => {
    sched.stop()
    setIsPlaying(false)
    setCurrentStep(-1)
    setLiveBpm(sched.baseBpm)
    setGapMuted(false)
    setCountingIn(false)
    releaseWake()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [sched, releaseWake])

  const toggle = useCallback(() => {
    if (sched.isPlaying) stop()
    else start()
  }, [sched, start, stop])

  useEffect(() => () => {
    sched.stop()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }, [sched])

  // Live setters — mutate the scheduler; safe to call while playing.
  const setBpm = useCallback((v) => { sched.baseBpm = v; sched.bpm = sched.rampedBpm() }, [sched])
  const setTempoRamp = useCallback((v) => {
    sched.tempoRamp = { ...sched.tempoRamp, ...v }
    sched.bpm = sched.rampedBpm()
  }, [sched])
  const setGapTrainer = useCallback((v) => { sched.gapTrainer = { ...sched.gapTrainer, ...v } }, [sched])
  const setCountIn = useCallback((v) => { sched.countIn = { ...sched.countIn, ...v } }, [sched])
  const setLoopRange = useCallback((v) => { sched.loopRange = v }, [sched])
  const setSwing = useCallback((v) => { sched.swing = v }, [sched])
  const setTimeSignature = useCallback((v) => { sched.timeSignature = v }, [sched])
  const setSubdivision = useCallback((v) => { sched.subdivision = v }, [sched])
  const setPattern = useCallback((v) => { sched.pattern = v }, [sched])
  const setAccentFirst = useCallback((v) => { sched.accentFirst = v }, [sched])
  const setMetronomeEnabled = useCallback((v) => { sched.metronomeEnabled = v }, [sched])
  const setSoundSubdivisions = useCallback((v) => { sched.soundSubdivisions = v }, [sched])
  const setMetronomeVolume = useCallback((v) => { sched.metronomeVolume = v }, [sched])
  const setPatternVolume = useCallback((v) => { sched.patternVolume = v }, [sched])

  return {
    isPlaying,
    currentStep,
    liveBpm,
    gapMuted,
    countingIn,
    start,
    stop,
    toggle,
    setBpm,
    setTempoRamp,
    setGapTrainer,
    setLoopRange,
    setSwing,
    setCountIn,
    setTimeSignature,
    setSubdivision,
    setPattern,
    setAccentFirst,
    setMetronomeEnabled,
    setSoundSubdivisions,
    setMetronomeVolume,
    setPatternVolume,
    scheduler: sched,
  }
}
