import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useI18n } from './i18n/I18nContext.jsx'
import { useScheduler } from './hooks/useScheduler.js'
import { useSpacebar } from './hooks/useSpacebar.js'
import { resumeAudio } from './audio/AudioEngine.js'
import { Icon, IconButton } from './components/ui.jsx'
import MetronomeView from './components/v2/MetronomeView.jsx'
import PlayerBar from './components/v2/PlayerBar.jsx'
import LibraryView from './components/v2/LibraryView.jsx'
import PracticeView from './components/v2/PracticeView.jsx'
import WorkoutView from './components/v2/WorkoutView.jsx'
import WorkoutsView from './components/v2/WorkoutsView.jsx'
import WorkoutEditorView from './components/v2/WorkoutEditorView.jsx'
import GuideView from './components/v2/GuideView.jsx'
import WhatsNew from './components/v2/WhatsNew.jsx'
import { entriesSince } from './data/changelog.js'
import { GUIDE } from './data/guide.js'
import { sigToTimeSignature } from './components/v2/util.js'
import { CATEGORIES, sigOf, getCatalogExercises } from './data/catalogV2.js'
import {
  WORKOUTS, adaptiveStartBpm, loadMyWorkouts, saveMyWorkout, deleteMyWorkout,
  emptyWorkout, duplicateWorkout, exportWorkoutFile, generateWorkout,
} from './data/workouts.js'
import {
  createEmptyExercise, exportExercise, exportLibraryFile, parseImported,
  loadLibrary, saveToLibrary, deleteFromLibrary, genId, barLayout,
} from './model/exercise.js'
import { logPracticeSeconds, logTempo, flushJournal, exportJournal, mergeJournal, getTempoStats, dayKey } from './model/progress.js'
import { generateRhythm, exerciseOfTheDay } from './data/generator.js'
import { loadFavs, toggleFav } from './model/favs.js'
import { setClickMode } from './audio/click.js'
import { initClickSamples } from './audio/clickSamples.js'
import { loadSetlist, toggleInSetlist, removeFromSetlist, moveInSetlist, clearSetlist } from './model/setlist.js'
import { decodeShare, shareFromHash } from './model/share.js'

const APP_VERSION = 'v5.38' // bump on each change so a stale cache is obvious on device
const TW_KEY = 'drums2_tw'
const PROG_KEY = 'drums2_progress'
const OPTS_KEY = 'drums2_opts'
const METRO_KEY = 'drums2_metro'
const TEMPO_KEY = 'drums2_tempo' // chosen bpm per catalog exercise id
const TW_DEFAULT = { theme: 'dark', accent: 'coral', density: 'regular' }
const METRO_DEFAULT = {
  bpm: 100, sig: '4/4', sub: 'quarter', accentOne: true, soundSubs: true, vol: 120, swing: 0,
  clickSound: 'synth', // 'synth' | 'sample' (user samples live in IndexedDB)
  switcher: { enabled: false, everyBars: 2, subs: ['eighth', 'sixteenth', 'triplet'] },
  poly: { enabled: false, against: 3 },
}
const OPTIONS_DEFAULT = {
  metroWith: true, accentOne: true, soundSubs: false, swing: 0,
  tempoRamp: { enabled: false, everyBars: 4, stepBpm: 5, maxBpm: 0 },
  gapTrainer: { enabled: false, onBars: 2, offBars: 2 },
  countIn: { enabled: false, bars: 1, mode: 'loop', feel: 'quarter' },
}
// UI swing is 0..100%; 100% = full triplet feel (long:short = 2:1).
const swingFraction = (pct) => Math.max(0, Math.min(100, pct || 0)) / 300
const clone = (x) => JSON.parse(JSON.stringify(x))

// Merge saved options over defaults, per nested block — older saves may be
// missing newer fields.
function mergeOptions(saved) {
  if (!saved) return OPTIONS_DEFAULT
  return {
    ...OPTIONS_DEFAULT,
    ...saved,
    tempoRamp: { ...OPTIONS_DEFAULT.tempoRamp, ...saved.tempoRamp },
    gapTrainer: { ...OPTIONS_DEFAULT.gapTrainer, ...saved.gapTrainer },
    countIn: { ...OPTIONS_DEFAULT.countIn, ...saved.countIn },
  }
}

const ACCENTS = ['coral', 'teal', 'indigo'] // amber retired: the footer row needs the room
const ACCENT_SWATCH = {
  coral: 'oklch(0.70 0.155 38)', teal: 'oklch(0.74 0.115 178)',
  indigo: 'oklch(0.62 0.16 274)', amber: 'oklch(0.78 0.14 78)',
}

function loadJSON(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def } catch { return def }
}

function BrandMark({ size = 20 }) {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="8" rx="8" ry="3.2" />
        <path d="M4 8v6c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V8" />
        <path d="M9 17.5l-3 4M15 17.5l3 4" />
      </svg>
    </span>
  )
}

export default function App() {
  const { t, lang } = useI18n()
  const [tw, setTw] = useState(() => ({ ...TW_DEFAULT, ...loadJSON(TW_KEY, {}) }))
  const [nav, setNav] = useState('metronome') // metronome | workouts | library | practice
  const [wkId, setWkId] = useState(null) // selected workout in the Workouts tab
  const [wkEdit, setWkEdit] = useState(null) // workout draft open in the editor
  const [myWk, setMyWk] = useState(() => loadMyWorkouts())
  const [item, setItem] = useState(null)
  const [saved, setSaved] = useState(() => loadLibrary())
  const [favs, setFavs] = useState(() => loadFavs())
  const onToggleFav = (id) => setFavs(toggleFav(id))
  // Setlist: an ordered queue played through by hand (no timers).
  const [setlist, setSetlist] = useState(() => loadSetlist())
  const [slRun, setSlRun] = useState(null) // { idx } while a setlist session runs
  const slRunRef = useRef(null)
  slRunRef.current = slRun
  const [progressMap, setProgressMap] = useState(() => loadJSON(PROG_KEY, {}))
  const [savedFlash, setSavedFlash] = useState(false)
  const [libTarget, setLibTarget] = useState({ section: 'home', cat: null })
  // Feedback goes through GitHub issues, prefilled with version + platform.
  const feedbackUrl = () => {
    const body = [
      '', '', '---',
      `App: shed. ${APP_VERSION}`,
      `Platform: ${navigator.userAgent}`,
      `Screen: ${window.innerWidth}×${window.innerHeight}`,
    ].join('\n')
    return `https://github.com/mrybas/shed/issues/new?labels=feedback&body=${encodeURIComponent(body)}`
  }
  const [guideTarget, setGuideTarget] = useState(null) // section anchor for the Guide
  const [guideActive, setGuideActive] = useState(null) // scroll-spied section
  const openGuide = (sectionId = null) => { setGuideTarget(sectionId); navTo('guide') }
  // What's new: shown once when the app version moved past what the user saw.
  // First-ever run just records the version — to a newcomer nothing is "new".
  const [whatsNew, setWhatsNew] = useState(() => {
    try {
      const seen = localStorage.getItem('drums2_seenver')
      if (!seen) { localStorage.setItem('drums2_seenver', APP_VERSION); return null }
      if (seen === APP_VERSION) return null
      const entries = entriesSince(seen)
      return entries.length ? entries : null
    } catch { return null }
  })
  const closeWhatsNew = () => {
    try { localStorage.setItem('drums2_seenver', APP_VERSION) } catch { /* ignore */ }
    setWhatsNew(null)
  }
  const [libOpen, setLibOpen] = useState(false)

  const [metro, setMetro] = useState(() => ({ ...METRO_DEFAULT, ...loadJSON(METRO_KEY, {}) }))
  const [options, setOptions] = useState(() => mergeOptions(loadJSON(OPTS_KEY, null)?.options))
  const [vols, setVols] = useState(() => ({ ex: 100, metro: 120, ...loadJSON(OPTS_KEY, null)?.vols }))
  const [tempoMap, setTempoMap] = useState(() => loadJSON(TEMPO_KEY, {}))
  const [loopRange, setLoopRange] = useState(null) // {from,to} bar indices, per opened exercise

  // ---- Workout runner: { wId, blockIdx, secLeft, done } while a routine runs.
  const [run, setRun] = useState(null)
  const runRef = useRef(run)
  runRef.current = run
  const exById = useMemo(() => new Map(getCatalogExercises().map((e) => [e.id, e])), [])
  // Stats/recents also need the user's saved exercises resolved by id.
  const exAndSavedById = useMemo(() => {
    const m = new Map(exById)
    saved.forEach((e) => m.set(e.id, e))
    return m
  }, [exById, saved])
  const [genWk, setGenWk] = useState(null) // last "surprise me" workout (ephemeral)
  const workoutById = (id) => WORKOUTS.find((w) => w.id === id) || myWk.find((w) => w.id === id) || (genWk?.id === id ? genWk : null)
  const surpriseMe = (level, minutes) => {
    const w = generateWorkout({ level, minutes, seed: Math.floor(Math.random() * 1e9) })
    setGenWk(w)
    setWkId(w.id)
  }

  // ---- Practice journal collectors ----
  const modeRef = useRef('metronome')
  const itemIdRef = useRef(null)

  const sched = useScheduler({ pattern: null, metronomeEnabled: true })
  useSpacebar(sched.toggle)

  // Load user click samples (IndexedDB) and keep the click mode applied.
  useEffect(() => { initClickSamples() }, [])
  useEffect(() => { setClickMode(metro.clickSound) }, [metro.clickSound])

  // iOS Safari: keep audio unlocked. iOS re-suspends the context (backgrounding,
  // route changes), so resume on every interaction, not just the first.
  useEffect(() => {
    const unlock = () => { resumeAudio() }
    const opts = { passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('touchend', unlock, opts)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchend', unlock) }
  }, [])

  // Practice-seconds collector: 1s tick while actually playing (no count-in);
  // metronome time logs under 'metronome'. Journal flushes are batched.
  useEffect(() => {
    const scheduler = sched.scheduler // stable instance
    const tick = setInterval(() => {
      if (!scheduler.isPlaying || scheduler.inCountIn()) return
      const exId = modeRef.current === 'metronome' ? 'metronome' : itemIdRef.current
      if (exId) logPracticeSeconds(exId, 1)
    }, 1000)
    const flush = setInterval(flushJournal, 10000)
    const onHide = () => flushJournal()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      clearInterval(tick); clearInterval(flush)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onHide)
      flushJournal()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Tempo records: remember the session's highest (ramped) bpm per exercise.
  const maxBpmRef = useRef(0)
  const [, bumpJournalVer] = useState(0)
  useEffect(() => {
    if (sched.isPlaying) {
      if (sched.liveBpm > maxBpmRef.current) maxBpmRef.current = sched.liveBpm
      return
    }
    const exId = modeRef.current === 'practice' ? itemIdRef.current : null
    if (exId && maxBpmRef.current) {
      logTempo(exId, maxBpmRef.current)
      flushJournal()
      bumpJournalVer((v) => v + 1) // let the open exercise show its new record
    }
    maxBpmRef.current = 0
  }, [sched.isPlaying, sched.liveBpm])

  // Open an exercise shared via URL (#x=...): decode, normalize, show.
  useEffect(() => {
    const payload = shareFromHash()
    if (!payload) return
    decodeShare(payload)
      .then((obj) => {
        const ex = parseImported(JSON.stringify(obj))
        if (ex && ex.rows) { ex.source = 'user'; setPracticeView('notes'); setItem(ex); setNav('practice') }
      })
      .catch(() => { /* malformed link — ignore */ })
    history.replaceState(null, '', location.pathname)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTweak = (k, v) => setTw((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const r = document.documentElement
    r.setAttribute('data-theme', tw.theme)
    r.setAttribute('data-accent', tw.accent)
    r.setAttribute('data-density', tw.density === 'regular' ? '' : tw.density)
    try { localStorage.setItem(TW_KEY, JSON.stringify(tw)) } catch { /* ignore */ }
  }, [tw])

  useEffect(() => { try { localStorage.setItem(PROG_KEY, JSON.stringify(progressMap)) } catch { /* ignore */ } }, [progressMap])
  useEffect(() => {
    // Don't persist while a workout block is live — those are the block's
    // settings, not the user's preferences.
    if (runRef.current && !runRef.current.done) return
    try { localStorage.setItem(OPTS_KEY, JSON.stringify({ options, vols })) } catch { /* ignore */ }
  }, [options, vols])
  useEffect(() => { try { localStorage.setItem(METRO_KEY, JSON.stringify(metro)) } catch { /* ignore */ } }, [metro])
  useEffect(() => { try { localStorage.setItem(TEMPO_KEY, JSON.stringify(tempoMap)) } catch { /* ignore */ } }, [tempoMap])

  // Remember the chosen tempo per catalog exercise (user exercises carry their
  // bpm in the saved data itself). Catches every path that changes item.bpm.
  // Workout blocks set their own tempos — don't let them pollute the user's map.
  useEffect(() => {
    if (!item || item.source === 'user' || runRef.current) return
    setTempoMap((m) => (m[item.id] === item.bpm ? m : { ...m, [item.id]: item.bpm }))
  }, [item])

  const mode = nav === 'metronome' ? 'metronome' : (item ? 'practice' : 'metronome')
  modeRef.current = mode
  itemIdRef.current = item?.id || null

  // A workout block writes its settings INTO the live options, so the panels
  // show exactly what's playing (speed trainer on, with its values) and remain
  // editable mid-block. The user's own options are snapshotted at workout start
  // and restored when it ends; they're never persisted while a block runs.
  const userOptsRef = useRef(null)
  const blockOptions = (block, cur) => {
    const s = block.settings || {}
    return {
      metroWith: true,
      accentOne: cur.accentOne,
      soundSubs: s.soundSubs ?? cur.soundSubs,
      swing: s.swing ?? 0,
      tempoRamp: { ...OPTIONS_DEFAULT.tempoRamp, ...(s.tempoRamp || { enabled: false }) },
      gapTrainer: { ...OPTIONS_DEFAULT.gapTrainer, ...(s.gapTrainer || { enabled: false }) },
      countIn: { ...OPTIONS_DEFAULT.countIn, enabled: true, ...(s.countIn || {}) },
    }
  }

  // Drive the single lifted scheduler from the active context.
  useEffect(() => {
    if (mode === 'metronome') {
      sched.setPattern(null)
      sched.setBpm(metro.bpm)
      sched.setTimeSignature(sigToTimeSignature(metro.sig))
      sched.setSubdivision(metro.sub)
      sched.setAccentFirst(metro.accentOne)
      sched.setAccentBeats(metro.accents)
      sched.setSoundSubdivisions(metro.soundSubs)
      sched.setMetronomeEnabled(true)
      sched.setMetronomeVolume(metro.vol / 100)
      sched.setTempoRamp({ enabled: false })
      sched.setGapTrainer({ enabled: false })
      sched.setCountIn({ enabled: false })
      sched.setLoopRange(null)
      sched.setSwing(swingFraction(metro.swing))
      sched.setSubSwitcher({ ...METRO_DEFAULT.switcher, ...metro.switcher })
      sched.setPoly({ ...METRO_DEFAULT.poly, ...metro.poly })
    } else if (item) {
      sched.setPattern(item)
      sched.setSubSwitcher({ enabled: false })
      sched.setPoly({ enabled: false })
      sched.setTempoRamp(options.tempoRamp)
      sched.setGapTrainer(options.gapTrainer)
      sched.setCountIn(options.countIn)
      sched.setLoopRange(loopRange)
      sched.setSwing(swingFraction(options.swing))
      sched.setBpm(item.bpm)
      sched.setTimeSignature(item.timeSignature)
      sched.setSubdivision(item.subdivision)
      sched.setAccentFirst(options.accentOne)
      sched.setAccentBeats(null)
      sched.setSoundSubdivisions(options.soundSubs)
      sched.setMetronomeEnabled(options.metroWith)
      sched.setMetronomeVolume(vols.metro / 100)
      sched.setPatternVolume(vols.ex / 100)
      sched.setMixer(Object.fromEntries(
        Object.entries(vols.mixer || {}).map(([k, v]) => [k, v / 100]),
      ))
    }
  }, [mode, metro, item, options, vols, loopRange, sched])

  // Stop playback when switching transport context.
  useEffect(() => { sched.stop() }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving the practice screen pauses the exercise — it shouldn't keep
  // playing while you browse. The player bar still shows it and can resume.
  const prevNavRef = useRef(nav)
  useEffect(() => {
    if (prevNavRef.current === 'practice' && nav !== 'practice') sched.stop()
    prevNavRef.current = nav
  }, [nav]) // eslint-disable-line react-hooks/exhaustive-deps

  const playing = sched.isPlaying
  const step = sched.currentStep

  // ---- handlers ----
  const refreshSaved = useCallback(() => setSaved(loadLibrary()), [])
  // Which view practice opens in: existing exercises land on notes, a brand
  // new (or freshly duplicated) one goes straight to the grid for editing.
  const [practiceView, setPracticeView] = useState('notes')
  const openItem = (ex) => {
    if (runRef.current) { setRun(null); restoreUserOptions() } // manual open ends a workout
    if (slRunRef.current) setSlRun(null)
    const it = clone(ex)
    // Restore the user's working tempo for catalog exercises.
    if (it.source !== 'user' && tempoMap[it.id]) it.bpm = tempoMap[it.id]
    setPracticeView('notes')
    setItem(it)
    setLoopRange(null) // loop ranges are per practice session
    setNav('practice')
  }
  const newExercise = () => { if (runRef.current) { setRun(null); restoreUserOptions() } setPracticeView('grid'); setItem(createEmptyExercise({ source: 'user', name: t('newExercise') })); setLoopRange(null); setNav('practice') }
  // Sight reading: open a freshly generated rhythm; "New rhythm" regenerates
  // at the same level with a new seed.
  const openGenerated = (level, seed) =>
    openItem(generateRhythm({ level, bars: 2, seed: seed ?? Math.floor(Math.random() * 1e9) }))
  const regenerate = () => { if (item?.genLevel) openGenerated(item.genLevel) }
  // The daily exercise — same seed (the local date) all day.
  const daily = useMemo(() => exerciseOfTheDay(dayKey()), [])

  // ---- Setlist session ----
  const resolveSetlistItem = (id) => exById.get(id) || saved.find((x) => x.id === id) || null
  const setlistItems = setlist.map((id) => resolveSetlistItem(id)).filter(Boolean)
  const onToggleSetlist = (id) => setSetlist(toggleInSetlist(id))
  const openSetlistIdx = (idx) => {
    const ex = setlistItems[idx]
    if (!ex) return
    const it = clone(ex)
    if (it.source !== 'user' && tempoMap[it.id]) it.bpm = tempoMap[it.id]
    setPracticeView('notes')
    setItem(it)
    setLoopRange(null)
    setNav('practice')
    setSlRun({ idx })
  }
  const startSetlist = () => { if (setlistItems.length) openSetlistIdx(0) }
  const setlistNext = () => {
    const cur = slRunRef.current
    if (!cur) return
    if (cur.idx + 1 >= setlistItems.length) { setSlRun(null); sched.stop(); return }
    openSetlistIdx(cur.idx + 1)
  }
  const stopSetlist = () => { setSlRun(null); sched.stop() }
  const slView = slRun ? {
    idx: slRun.idx + 1,
    total: setlistItems.length,
    nextName: setlistItems[slRun.idx + 1]?.name || null,
  } : null
  // Fully close the exercise from the player bar: stop the transport and
  // return the bar to plain-metronome duty.
  const closeItem = () => {
    if (runRef.current) { setRun(null); restoreUserOptions() }
    sched.stop()
    setItem(null)
    setLoopRange(null)
    if (nav === 'practice') setNav('library')
  }

  // ---- Workout runner ----
  const restoreUserOptions = useCallback(() => {
    if (userOptsRef.current) { setOptions(userOptsRef.current); userOptsRef.current = null }
  }, [])

  const openWorkoutBlock = useCallback((w, idx) => {
    const block = w.blocks[idx]
    const src = exById.get(block.exerciseId)
    if (!src) return
    const it = clone(src)
    if (block.settings?.bpm) it.bpm = block.settings.bpm
    // Adaptive progression: resume ramped blocks near the last reached tempo.
    const resumed = adaptiveStartBpm(block, getTempoStats(block.exerciseId))
    if (resumed) it.bpm = resumed
    setPracticeView('notes')
    setItem(it)
    setOptions((cur) => blockOptions(block, cur))
    setLoopRange(null)
    setNav('practice')
  }, [exById]) // eslint-disable-line react-hooks/exhaustive-deps

  const startWorkout = (wId) => {
    const w = workoutById(wId)
    if (!w) return
    if (!userOptsRef.current) userOptsRef.current = options // restore after the workout
    setRun({ wId, blockIdx: 0, secLeft: w.blocks[0].minutes * 60, done: false })
    openWorkoutBlock(w, 0)
    setTimeout(() => sched.start(), 200)
  }

  const advanceWorkout = useCallback(() => {
    const r = runRef.current
    if (!r || r.done) return
    const w = workoutById(r.wId)
    sched.stop()
    const next = r.blockIdx + 1
    if (next >= w.blocks.length) {
      setRun({ ...r, done: true, secLeft: 0 })
      restoreUserOptions()
    } else {
      setRun({ wId: r.wId, blockIdx: next, secLeft: w.blocks[next].minutes * 60, done: false })
      openWorkoutBlock(w, next)
      setTimeout(() => sched.start(), 300)
    }
  }, [sched, openWorkoutBlock, restoreUserOptions])

  const stopWorkout = useCallback(() => { setRun(null); sched.stop(); restoreUserOptions() }, [sched, restoreUserOptions])

  // ---- Custom workouts ----
  const saveWk = (w) => {
    const list = saveMyWorkout(w)
    if (!list) { alert('Could not save — browser storage is full.'); return }
    setMyWk(list)
    setWkEdit(null)
    setWkId(w.id)
  }
  const deleteWk = (id) => {
    setMyWk(deleteMyWorkout(id))
    if (wkId === id) setWkId(null)
  }
  const duplicateWk = (w) => { setWkId(null); setWkEdit(duplicateWorkout(w)) }

  // Navigating anywhere away from the workout's practice page ends the workout —
  // the player-bar strip exists only while a routine is actually running.
  const navTo = useCallback((dest) => {
    if (runRef.current) { setRun(null); sched.stop(); restoreUserOptions() }
    if (slRunRef.current) setSlRun(null)
    setNav(dest)
  }, [sched, restoreUserOptions])

  // Block timer — ticks only while playing, so pausing the player pauses the
  // workout (the minutes count actual practice). The effect must depend ONLY on
  // whether a run is active: `sched` is a fresh object every render, and the
  // playhead re-renders constantly during playback — depending on it would
  // reset the interval before it ever fires.
  const runActive = !!run && !run.done
  const advanceRef = useRef(advanceWorkout)
  advanceRef.current = advanceWorkout
  useEffect(() => {
    if (!runActive) return undefined
    const scheduler = sched.scheduler // stable instance for the run's lifetime
    const id = setInterval(() => {
      const r = runRef.current
      // Tick only during the exercise itself — not while paused, not during a
      // count-in lead-in (those seconds aren't practice).
      if (!r || r.done || !scheduler.isPlaying || scheduler.inCountIn()) return
      if (r.secLeft > 1) setRun({ ...r, secLeft: r.secLeft - 1 })
      else advanceRef.current()
    }, 1000)
    return () => clearInterval(id)
  }, [runActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // What PracticeView shows in the workout banner.
  const runView = useMemo(() => {
    if (!run) return null
    const w = workoutById(run.wId)
    if (!w) return null
    const block = w.blocks[Math.min(run.blockIdx, w.blocks.length - 1)]
    const nextBlock = w.blocks[run.blockIdx + 1]
    return {
      name: w.name, idx: run.blockIdx + 1, total: w.blocks.length,
      secLeft: run.secLeft, note: block.note, done: !!run.done,
      resumed: adaptiveStartBpm(block, getTempoStats(block.exerciseId)),
      nextName: nextBlock ? (exById.get(nextBlock.exerciseId)?.name || '') : null,
    }
  }, [run, exById])

  const setProgress = (state) => {
    if (!item) return
    setProgressMap((m) => { const n = { ...m }; if (state === 'none') delete n[item.id]; else n[item.id] = state; return n })
  }

  // Strip catalog-only metadata when an exercise becomes a user copy.
  const asUserCopy = (ex) => {
    const { sourceNumber, page, cat, ...rest } = clone(ex) // eslint-disable-line no-unused-vars
    return { ...rest, id: genId(), source: 'user', section: null, number: null }
  }

  const saveCurrent = () => {
    if (!item) return
    let ex = item
    if (ex.source !== 'user' || ex.id.startsWith('builtin') || ex.id.startsWith('dci') || ex.id.startsWith('sc_')) {
      ex = asUserCopy(ex)
      setItem(ex)
    }
    if (!saveToLibrary(ex)) alert('Could not save — browser storage is full.')
    refreshSaved()
    setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500)
  }

  const duplicate = () => {
    if (!item) return
    const copy = { ...asUserCopy(item), name: item.name + ' (copy)' }
    if (!saveToLibrary(copy)) alert('Could not save — browser storage is full.')
    refreshSaved(); setPracticeView('grid'); setItem(copy); setNav('practice')
  }

  const deleteSaved = (id) => { deleteFromLibrary(id); refreshSaved(); if (item && item.id === id) setNav('library') }

  const importFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseImported(String(reader.result))
        if (parsed.type === 'library') {
          // Merge a whole-library backup; skip entries identical to existing ones.
          const existing = loadLibrary()
          const sig = (e) => JSON.stringify({ n: e.name, r: e.rows, s: e.sticking, b: e.bars || null })
          const seen = new Set(existing.map(sig))
          let added = 0
          parsed.exercises.forEach((ex) => {
            if (seen.has(sig(ex))) return
            ex.source = 'user'
            saveToLibrary(ex)
            added += 1
          })
          if (parsed.journal) mergeJournal(parsed.journal)
          if (parsed.myWorkouts) {
            const have = new Set(loadMyWorkouts().map((w) => w.name + '|' + w.blocks.length))
            let list = null
            parsed.myWorkouts.forEach((w) => {
              if (have.has(w.name + '|' + w.blocks.length)) return
              list = saveMyWorkout({ ...w, custom: true })
            })
            if (list) setMyWk(list)
          }
          refreshSaved()
          setLibTarget({ section: 'saved', cat: null })
          setNav('library')
          alert(`Imported ${added} exercise${added === 1 ? '' : 's'}${added < parsed.exercises.length ? ` (${parsed.exercises.length - added} duplicates skipped)` : ''}.`)
        } else if (parsed.type === 'workout') {
          const w = { ...parsed.workout, custom: true }
          const list = saveMyWorkout(w)
          if (list) { setMyWk(list); setWkEdit(null); setWkId(w.id); navTo('workouts') }
        } else {
          parsed.source = 'user'
          saveToLibrary(parsed); refreshSaved(); setPracticeView('notes'); setItem(parsed); setNav('practice')
        }
      } catch {
        alert('Could not import this file.')
      }
    }
    reader.readAsText(file)
  }

  const masteredCount = useMemo(() => Object.values(progressMap).filter((x) => x === 'mastered').length, [progressMap])

  // transport params for the player bar
  const sig = mode === 'metronome' ? metro.sig : (item ? sigOf(item) : '4/4')
  const sub = mode === 'metronome' ? (playing ? sched.liveSub : metro.sub) : (item ? item.subdivision : 'quarter')
  const bpm = mode === 'metronome' ? metro.bpm : (item ? item.bpm : 100)
  const setActiveBpm = (b) => mode === 'metronome' ? setMetro((m) => ({ ...m, bpm: b })) : setItem((p) => ({ ...p, bpm: b }))

  // Meter-aware beat indicator for the player bar: the current bar's beats with
  // their own subdivision dots (a triplet beat shows 3, a 16th beat shows 4).
  const barView = useMemo(() => {
    if (mode !== 'practice' || !item) return null
    const layout = barLayout(item)
    let curBar = null
    if (step >= 0) {
      for (const b of layout.bars) {
        if (step >= b.startStep && step < b.startStep + b.stepCount) curBar = b
      }
    }
    const shown = curBar || layout.bars[0]
    return {
      bars: layout.bars.length,
      barIndex: shown.bar,
      beatLens: shown.beats.map((bt) => bt.len),
      stepInBar: curBar && step >= 0 ? step - shown.startStep : -1,
    }
  }, [mode, item, step])

  const themeIcon = tw.theme === 'dark' ? 'sun' : 'moon'
  const toggleTheme = () => setTweak('theme', tw.theme === 'dark' ? 'light' : 'dark')
  // While a workout runs, the open practice page belongs to Workouts, not Library.
  const libActive = nav === 'library' || (nav === 'practice' && !run)
  const wkActive = nav === 'workouts' || (nav === 'practice' && !!run)
  const goLib = (target) => { setLibTarget(target); navTo('library'); if (!libOpen) setLibOpen(true) }

  const accentPicker = (
    <div className="accent-picker" role="group" aria-label={t('theme')}>
      {ACCENTS.map((a) => (
        <button key={a} className={'accent-dot' + (tw.accent === a ? ' is-active' : '')} aria-label={a}
          style={{ background: ACCENT_SWATCH[a] }} onClick={() => setTweak('accent', a)} />
      ))}
    </div>
  )

  return (
    <div className="shell" data-mode={mode}>
      <header className="topbar">
        <button className="side-brand brand-btn" onClick={() => navTo('metronome')} aria-label={t('tabMetronome')}>
          <BrandMark size={18} /><span className="brand-name">{t('appName')}</span><span className="app-version num">{APP_VERSION}</span>
        </button>
        <span className="topbar-acts">
          <button className="iconbtn" aria-label={t('guideTitle')} title={t('guideTitle')} onClick={() => openGuide()}>
            <span className="qmark">?</span>
          </button>
          <a className="iconbtn" href="https://github.com/mrybas/shed" target="_blank" rel="noopener noreferrer"
            aria-label="GitHub" title="GitHub"><Icon name="github" /></a>
          <IconButton icon={themeIcon} label={t('theme')} onClick={toggleTheme} />
        </span>
      </header>

      <aside className="sidebar">
        <button className="side-brand brand-btn" onClick={() => navTo('metronome')} aria-label={t('tabMetronome')}>
          <BrandMark /><span className="brand-name">{t('appName')}</span>
        </button>
        <nav className="side-nav">
          <button className={'side-link' + (nav === 'metronome' ? ' is-active' : '')} onClick={() => navTo('metronome')}>
            <Icon name="metro" className="ic" /><span>{t('tabMetronome')}</span>
          </button>
          <div className="side-tree">
            <div className={'side-link side-parent' + (libActive ? ' is-active' : '')}>
              <button className="side-parent-main" onClick={() => goLib({ section: 'home', cat: null })}>
                <Icon name="library" className="ic" /><span>{t('library')}</span>
              </button>
              <button className={'side-caret' + (libOpen ? ' open' : '')} aria-label="toggle" onClick={() => setLibOpen((o) => !o)}>
                <Icon name="chevright" className="ic-xs" />
              </button>
            </div>
            {libOpen && (
              <div className="side-sub">
                {CATEGORIES.map((c) => (
                  <button key={c.id} className={'side-subitem' + (libActive && libTarget.section === 'cat' && libTarget.cat === c.id ? ' is-active' : '')} onClick={() => goLib({ section: 'cat', cat: c.id })}>
                    <span className="side-dot" style={{ background: c.hue }} />{c.label[lang] || c.label.en}
                  </button>
                ))}
                <button className={'side-subitem' + (libActive && libTarget.section === 'saved' ? ' is-active' : '')} onClick={() => goLib({ section: 'saved', cat: null })}>
                  <Icon name="bookmark" className="ic-xs side-subic" />{t('saved')}
                  {saved.length > 0 && <span className="side-badge num">{saved.length}</span>}
                </button>
              </div>
            )}
          </div>
          <button className={'side-link' + (wkActive ? ' is-active' : '')} onClick={() => { setWkId(null); setWkEdit(null); navTo('workouts') }}>
            <Icon name="star" className="ic" /><span>{t('workouts')}</span>
          </button>
          <button className={'side-link' + (nav === 'guide' ? ' is-active' : '')} onClick={() => openGuide()}>
            <Icon name="bookmark" className="ic" /><span>{t('guideTitle')}</span>
          </button>
          <a className="side-link side-link-ext" href={feedbackUrl()} target="_blank" rel="noopener noreferrer">
            <Icon name="upload" className="ic" /><span>{t('feedback')}</span>
          </a>
          {nav === 'guide' && (
            <div className="side-sub">
              {GUIDE.map((sec) => (
                <button key={sec.id}
                  className={'side-subitem' + (guideActive === sec.id ? ' is-active' : '')}
                  onClick={() => { setGuideTarget(null); requestAnimationFrame(() => setGuideTarget(sec.id)) }}>
                  <Icon name={sec.icon} className="ic-xs side-subic" />{sec.title}
                </button>
              ))}
            </div>
          )}
        </nav>
        <div className="side-stat">
          <Icon name="star" className="ic-xs" /><span className="num">{masteredCount}</span> <span>{t('mastered')}</span>
        </div>
        <div className="side-foot">
          <div className="side-foot-row">
            {accentPicker}
            <span className="app-version num">{APP_VERSION}</span>
            <span className="side-foot-acts">
              <a className="iconbtn" href="https://github.com/mrybas/shed" target="_blank" rel="noopener noreferrer"
                aria-label="GitHub" title="GitHub"><Icon name="github" /></a>
              <IconButton icon={themeIcon} label={t('theme')} onClick={toggleTheme} />
            </span>
          </div>
        </div>
      </aside>

      <main className="main">
        {nav === 'metronome' && <MetronomeView t={t} metro={metro} setMetro={setMetro} playing={playing && mode === 'metronome'} step={step} liveSub={sched.liveSub} />}
        {nav === 'guide' && <GuideView t={t} target={guideTarget} onActiveChange={setGuideActive} feedbackUrl={feedbackUrl()} />}
        {nav === 'workouts' && (wkEdit ? (
          <WorkoutEditorView t={t} initial={wkEdit} exercises={[...exById.values()]}
            onSave={saveWk} onCancel={() => setWkEdit(null)} />
        ) : wkId ? (
          <WorkoutView t={t} workout={workoutById(wkId)} exercisesById={exById}
            onStart={startWorkout} onOpenExercise={openItem}
            onEdit={(w) => { setWkId(null); setWkEdit(w) }} onDuplicate={duplicateWk}
            onExport={exportWorkoutFile}
            onBack={() => setWkId(null)} />
        ) : (
          <WorkoutsView t={t} lang={lang} exercisesById={exAndSavedById} onOpenWorkout={setWkId}
            myWorkouts={myWk} onNew={() => setWkEdit(emptyWorkout())}
            onEdit={(w) => setWkEdit(w)} onDelete={deleteWk}
            daily={daily} onOpenDaily={() => openItem(daily)}
            onSurprise={surpriseMe}
            setlistItems={setlistItems} onSetlistStart={startSetlist}
            onSetlistRemove={(id) => setSetlist(removeFromSetlist(id))}
            onSetlistMove={(id, dir) => setSetlist(moveInSetlist(id, dir))}
            onSetlistClear={() => setSetlist(clearSetlist())} />
        ))}
        {nav === 'library' && (
          <LibraryView t={t} lang={lang} saved={saved} progressMap={progressMap} onOpen={openItem}
            onNew={newExercise} onImport={importFile} onExportItem={exportExercise} onExportAll={() => exportLibraryFile({ journal: exportJournal(), myWorkouts: loadMyWorkouts() })}
            onDeleteSaved={deleteSaved} route={libTarget} onRoute={setLibTarget}
            onGenerate={openGenerated} favs={favs} onToggleFav={onToggleFav} />
        )}
        {nav === 'practice' && item && (
          <PracticeView t={t} lang={lang} item={item} setItem={setItem} options={options} setOptions={setOptions}
            initialView={practiceView}
            vols={vols} setVols={setVols} playing={playing && mode === 'practice'} step={step}
            loopRange={loopRange} onLoopRange={setLoopRange}
            progress={progressMap[item.id] || 'none'} onProgress={setProgress} onDuplicate={duplicate}
            onBack={() => { if (runRef.current) { stopWorkout(); setNav('workouts') } else setNav('library') }} onSave={saveCurrent} onExport={() => exportExercise(item)}
            onNew={newExercise} savedFlash={savedFlash} onRegenerate={regenerate}
            fav={favs.includes(item.id)} onToggleFav={() => onToggleFav(item.id)}
            inSetlist={setlist.includes(item.id)} onToggleSetlist={() => onToggleSetlist(item.id)}
            clickSound={metro.clickSound || 'synth'} onClickSound={(v) => setMetro((m) => ({ ...m, clickSound: v }))} />
        )}
      </main>

      <PlayerBar
        t={t} mode={mode} title={mode === 'metronome' ? t('simpleMetro') : (item ? item.name : t('simpleMetro'))}
        bpm={playing ? sched.liveBpm : bpm} setBpm={setActiveBpm} sig={sig} sub={sub}
        setSub={(s) => setMetro((m) => ({ ...m, sub: s }))} showSub={mode === 'metronome'}
        soundSubs={mode === 'metronome' ? metro.soundSubs : options.soundSubs}
        onToggleSoundSubs={(v) => mode === 'metronome' ? setMetro((m) => ({ ...m, soundSubs: v })) : setOptions((o) => ({ ...o, soundSubs: v }))}
        step={step} playing={playing} onToggle={sched.toggle} gapMuted={sched.gapMuted} countingIn={sched.countingIn}
        barView={barView} loopRange={mode === 'practice' ? loopRange : null}
        workout={runView} onWorkoutSkip={advanceWorkout} onWorkoutStop={stopWorkout}
        setlist={slView} onSetlistNext={setlistNext} onSetlistStop={stopSetlist}
        onOpenItem={mode === 'practice' && nav !== 'practice' ? () => setNav('practice') : null}
        onClearItem={mode === 'practice' ? closeItem : null} />

      {whatsNew && (
        <WhatsNew t={t} entries={whatsNew} version={APP_VERSION}
          onClose={closeWhatsNew} onOpenGuide={openGuide} />
      )}

      <nav className="bottomnav">
        <button className={'bn-link' + (nav === 'metronome' ? ' is-active' : '')} onClick={() => navTo('metronome')}>
          <Icon name="metro" className="ic" /><span>{t('tabMetronome')}</span>
        </button>
        <button className={'bn-link' + (libActive ? ' is-active' : '')} onClick={() => goLib({ section: 'home', cat: null })}>
          <Icon name="library" className="ic" /><span>{t('library')}</span>
        </button>
        <button className={'bn-link' + (wkActive ? ' is-active' : '')} onClick={() => { setWkId(null); setWkEdit(null); navTo('workouts') }}>
          <Icon name="star" className="ic" /><span>{t('workouts')}</span>
        </button>
      </nav>
    </div>
  )
}
