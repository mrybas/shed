import { useState, useEffect, useMemo, useCallback } from 'react'
import { useI18n } from './i18n/I18nContext.jsx'
import { useScheduler } from './hooks/useScheduler.js'
import { useSpacebar } from './hooks/useSpacebar.js'
import { resumeAudio } from './audio/AudioEngine.js'
import { Icon, IconButton } from './components/ui.jsx'
import MetronomeView from './components/v2/MetronomeView.jsx'
import PlayerBar from './components/v2/PlayerBar.jsx'
import LibraryView from './components/v2/LibraryView.jsx'
import PracticeView from './components/v2/PracticeView.jsx'
import { sigToTimeSignature } from './components/v2/util.js'
import { CATEGORIES, sigOf } from './data/catalogV2.js'
import {
  createEmptyExercise, exportExercise, parseImported,
  loadLibrary, saveToLibrary, deleteFromLibrary, genId, barLayout,
} from './model/exercise.js'

const APP_VERSION = 'v3.6' // bump on each change so a stale cache is obvious on device
const TW_KEY = 'drums2_tw'
const PROG_KEY = 'drums2_progress'
const OPTS_KEY = 'drums2_opts'
const METRO_KEY = 'drums2_metro'
const TEMPO_KEY = 'drums2_tempo' // chosen bpm per catalog exercise id
const TW_DEFAULT = { theme: 'dark', accent: 'coral', density: 'regular' }
const METRO_DEFAULT = { bpm: 100, sig: '4/4', sub: 'quarter', accentOne: true, soundSubs: true, vol: 120 }
const OPTIONS_DEFAULT = {
  metroWith: true, accentOne: true, soundSubs: false,
  tempoRamp: { enabled: false, everyBars: 4, stepBpm: 5, maxBpm: 0 },
  gapTrainer: { enabled: false, onBars: 2, offBars: 2 },
  countIn: { enabled: false, bars: 1, mode: 'loop', feel: 'quarter' },
}
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

const ACCENTS = ['coral', 'teal', 'indigo', 'amber']
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
  const [nav, setNav] = useState('metronome') // metronome | library | practice
  const [item, setItem] = useState(null)
  const [saved, setSaved] = useState(() => loadLibrary())
  const [progressMap, setProgressMap] = useState(() => loadJSON(PROG_KEY, {}))
  const [savedFlash, setSavedFlash] = useState(false)
  const [libTarget, setLibTarget] = useState({ section: 'home', cat: null })
  const [libOpen, setLibOpen] = useState(false)

  const [metro, setMetro] = useState(() => ({ ...METRO_DEFAULT, ...loadJSON(METRO_KEY, {}) }))
  const [options, setOptions] = useState(() => mergeOptions(loadJSON(OPTS_KEY, null)?.options))
  const [vols, setVols] = useState(() => ({ ex: 100, metro: 120, ...loadJSON(OPTS_KEY, null)?.vols }))
  const [tempoMap, setTempoMap] = useState(() => loadJSON(TEMPO_KEY, {}))

  const sched = useScheduler({ pattern: null, metronomeEnabled: true })
  useSpacebar(sched.toggle)

  // iOS Safari: keep audio unlocked. iOS re-suspends the context (backgrounding,
  // route changes), so resume on every interaction, not just the first.
  useEffect(() => {
    const unlock = () => { resumeAudio() }
    const opts = { passive: true }
    window.addEventListener('pointerdown', unlock, opts)
    window.addEventListener('touchend', unlock, opts)
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('touchend', unlock) }
  }, [])

  const setTweak = (k, v) => setTw((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const r = document.documentElement
    r.setAttribute('data-theme', tw.theme)
    r.setAttribute('data-accent', tw.accent)
    r.setAttribute('data-density', tw.density === 'regular' ? '' : tw.density)
    try { localStorage.setItem(TW_KEY, JSON.stringify(tw)) } catch { /* ignore */ }
  }, [tw])

  useEffect(() => { try { localStorage.setItem(PROG_KEY, JSON.stringify(progressMap)) } catch { /* ignore */ } }, [progressMap])
  useEffect(() => { try { localStorage.setItem(OPTS_KEY, JSON.stringify({ options, vols })) } catch { /* ignore */ } }, [options, vols])
  useEffect(() => { try { localStorage.setItem(METRO_KEY, JSON.stringify(metro)) } catch { /* ignore */ } }, [metro])
  useEffect(() => { try { localStorage.setItem(TEMPO_KEY, JSON.stringify(tempoMap)) } catch { /* ignore */ } }, [tempoMap])

  // Remember the chosen tempo per catalog exercise (user exercises carry their
  // bpm in the saved data itself). Catches every path that changes item.bpm.
  useEffect(() => {
    if (!item || item.source === 'user') return
    setTempoMap((m) => (m[item.id] === item.bpm ? m : { ...m, [item.id]: item.bpm }))
  }, [item])

  const mode = nav === 'metronome' ? 'metronome' : (item ? 'practice' : 'metronome')

  // Drive the single lifted scheduler from the active context.
  useEffect(() => {
    if (mode === 'metronome') {
      sched.setPattern(null)
      sched.setBpm(metro.bpm)
      sched.setTimeSignature(sigToTimeSignature(metro.sig))
      sched.setSubdivision(metro.sub)
      sched.setAccentFirst(metro.accentOne)
      sched.setSoundSubdivisions(metro.soundSubs)
      sched.setMetronomeEnabled(true)
      sched.setMetronomeVolume(metro.vol / 100)
      sched.setTempoRamp({ enabled: false })
      sched.setGapTrainer({ enabled: false })
      sched.setCountIn({ enabled: false })
    } else if (item) {
      sched.setPattern(item)
      sched.setTempoRamp(options.tempoRamp)
      sched.setGapTrainer(options.gapTrainer)
      sched.setCountIn(options.countIn)
      sched.setBpm(item.bpm)
      sched.setTimeSignature(item.timeSignature)
      sched.setSubdivision(item.subdivision)
      sched.setAccentFirst(options.accentOne)
      sched.setSoundSubdivisions(options.soundSubs)
      sched.setMetronomeEnabled(options.metroWith)
      sched.setMetronomeVolume(vols.metro / 100)
      sched.setPatternVolume(vols.ex / 100)
    }
  }, [mode, metro, item, options, vols, sched])

  // Stop playback when switching transport context.
  useEffect(() => { sched.stop() }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  const playing = sched.isPlaying
  const step = sched.currentStep

  // ---- handlers ----
  const refreshSaved = useCallback(() => setSaved(loadLibrary()), [])
  const openItem = (ex) => {
    const it = clone(ex)
    // Restore the user's working tempo for catalog exercises.
    if (it.source !== 'user' && tempoMap[it.id]) it.bpm = tempoMap[it.id]
    setItem(it)
    setNav('practice')
  }
  const newExercise = () => { setItem(createEmptyExercise({ source: 'user', name: t('newExercise') })); setNav('practice') }

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
    refreshSaved(); setItem(copy); setNav('practice')
  }

  const deleteSaved = (id) => { deleteFromLibrary(id); refreshSaved(); if (item && item.id === id) setNav('library') }

  const importFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const ex = parseImported(String(reader.result))
        ex.source = 'user'
        saveToLibrary(ex); refreshSaved(); setItem(ex); setNav('practice')
      } catch {
        alert('Could not import this file.')
      }
    }
    reader.readAsText(file)
  }

  const masteredCount = useMemo(() => Object.values(progressMap).filter((x) => x === 'mastered').length, [progressMap])

  // transport params for the player bar
  const sig = mode === 'metronome' ? metro.sig : (item ? sigOf(item) : '4/4')
  const sub = mode === 'metronome' ? metro.sub : (item ? item.subdivision : 'quarter')
  const bpm = mode === 'metronome' ? metro.bpm : (item ? item.bpm : 100)
  const setActiveBpm = (b) => mode === 'metronome' ? setMetro((m) => ({ ...m, bpm: b })) : setItem((p) => ({ ...p, bpm: b }))

  // Meter-aware beat indicator for the player bar (handles multi-bar / mixed meter).
  const barView = useMemo(() => {
    if (mode !== 'practice' || !item) return null
    const layout = barLayout(item)
    let cur = null
    if (step >= 0) {
      for (const b of layout.bars) {
        for (const bt of b.beats) {
          if (step >= bt.start && step < bt.start + bt.len) cur = { bar: b.bar, beatInBar: bt.beatInBar, beatsInBar: b.beats.length }
        }
      }
    }
    return {
      bars: layout.bars.length,
      barIndex: cur ? cur.bar : 0,
      beatsInBar: cur ? cur.beatsInBar : layout.bars[0].beats.length,
      beatInBar: cur ? cur.beatInBar : -1,
    }
  }, [mode, item, step])

  const themeIcon = tw.theme === 'dark' ? 'sun' : 'moon'
  const toggleTheme = () => setTweak('theme', tw.theme === 'dark' ? 'light' : 'dark')
  const libActive = nav === 'library' || nav === 'practice'
  const goLib = (target) => { setLibTarget(target); setNav('library'); if (!libOpen) setLibOpen(true) }

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
        <div className="side-brand"><BrandMark size={18} /><span className="brand-name">{t('appName')}</span><span className="app-version num">{APP_VERSION}</span></div>
        <IconButton icon={themeIcon} label={t('theme')} onClick={toggleTheme} />
      </header>

      <aside className="sidebar">
        <div className="side-brand"><BrandMark /><span className="brand-name">{t('appName')}</span></div>
        <nav className="side-nav">
          <button className={'side-link' + (nav === 'metronome' ? ' is-active' : '')} onClick={() => setNav('metronome')}>
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
        </nav>
        <div className="side-stat">
          <Icon name="star" className="ic-xs" /><span className="num">{masteredCount}</span> <span>{t('mastered')}</span>
        </div>
        <div className="side-foot">
          {accentPicker}
          <div className="side-foot-row">
            <span className="app-version num">{APP_VERSION}</span>
            <IconButton icon={themeIcon} label={t('theme')} onClick={toggleTheme} />
          </div>
        </div>
      </aside>

      <main className="main">
        {nav === 'metronome' && <MetronomeView t={t} metro={metro} setMetro={setMetro} playing={playing && mode === 'metronome'} step={step} />}
        {nav === 'library' && (
          <LibraryView t={t} lang={lang} saved={saved} progressMap={progressMap} onOpen={openItem}
            onNew={newExercise} onImport={importFile} onExportItem={exportExercise} onDeleteSaved={deleteSaved}
            route={libTarget} onRoute={setLibTarget} />
        )}
        {nav === 'practice' && item && (
          <PracticeView t={t} lang={lang} item={item} setItem={setItem} options={options} setOptions={setOptions}
            vols={vols} setVols={setVols} playing={playing && mode === 'practice'} step={step}
            progress={progressMap[item.id] || 'none'} onProgress={setProgress} onDuplicate={duplicate}
            onBack={() => setNav('library')} onSave={saveCurrent} onExport={() => exportExercise(item)}
            onNew={newExercise} savedFlash={savedFlash} />
        )}
      </main>

      <PlayerBar
        t={t} mode={mode} title={mode === 'metronome' ? t('simpleMetro') : (item ? item.name : t('simpleMetro'))}
        bpm={playing ? sched.liveBpm : bpm} setBpm={setActiveBpm} sig={sig} sub={sub}
        setSub={(s) => setMetro((m) => ({ ...m, sub: s }))} showSub={mode === 'metronome'}
        soundSubs={mode === 'metronome' ? metro.soundSubs : options.soundSubs}
        onToggleSoundSubs={(v) => mode === 'metronome' ? setMetro((m) => ({ ...m, soundSubs: v })) : setOptions((o) => ({ ...o, soundSubs: v }))}
        step={step} playing={playing} onToggle={sched.toggle} gapMuted={sched.gapMuted} countingIn={sched.countingIn} barView={barView} />

      <nav className="bottomnav">
        <button className={'bn-link' + (nav === 'metronome' ? ' is-active' : '')} onClick={() => setNav('metronome')}>
          <Icon name="metro" className="ic" /><span>{t('tabMetronome')}</span>
        </button>
        <button className={'bn-link' + (libActive ? ' is-active' : '')} onClick={() => goLib({ section: 'home', cat: null })}>
          <Icon name="library" className="ic" /><span>{t('library')}</span>
        </button>
      </nav>
    </div>
  )
}
