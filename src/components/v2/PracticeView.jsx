import { useState, useEffect, useRef, useCallback } from 'react'
import { Slider, NumberStepper, NotePicker, NoteGlyph, Segmented, Switch, Button, Icon } from '../ui.jsx'
import { useTapTempo } from '../../hooks/useTapTempo.js'
import NotationView from '../NotationView.jsx'
import SoundSheet from './SoundSheet.jsx'
import { TIME_SIGS } from './util.js'
import { CAT, catOf, sigOf, levelOf } from '../../data/catalogV2.js'
import { getTempoStats, setTempoGoal } from '../../model/progress.js'
import { shareUrlFor } from '../../model/share.js'

// Tiny tempo-history graph for the exercise meta area.
function Sparkline({ history }) {
  if (!history || history.length < 2) return null
  const w = 120; const h = 26; const pad = 2
  const vals = history.map((p) => p.bpm)
  const min = Math.min(...vals); const max = Math.max(...vals)
  const span = Math.max(1, max - min)
  const pts = vals.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / (vals.length - 1)
    const y = h - pad - ((v - min) * (h - pad * 2)) / span
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg className="tempo-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
import { INSTRUMENTS, resizeExercise, setBeatSub, setAllBeatSubs, barLayout, addBar, insertBar, insertBars, barsSnapshot, duplicateBars, repeatBars, removeBars, setBarTimeSignature, getSections, setSectionLabel, sectionRange } from '../../model/exercise.js'
import { sigToTimeSignature } from './util.js'

const INSTR_COLORS = {
  crash: 'oklch(0.72 0.13 320)', ride: 'oklch(0.74 0.12 250)', hihatOpen: 'oklch(0.78 0.13 95)',
  hihatClosed: 'oklch(0.74 0.12 175)', hihatPedal: 'oklch(0.68 0.1 185)', tom1: 'oklch(0.72 0.13 60)', tom2: 'oklch(0.68 0.13 45)',
  snare: 'oklch(0.7 0.16 38)', floorTom: 'oklch(0.6 0.12 25)', kick: 'oklch(0.6 0.04 260)',
}

const cloneEx = (x) => JSON.parse(JSON.stringify(x))

// Stamp palette: each tool writes one definite cell state (drag-paintable).
const STAMPS = {
  hit: () => ({ on: true, accent: false, roll: 0 }),
  accent: () => ({ on: true, accent: true, roll: 0 }),
  ghost: () => ({ on: true, accent: false, roll: 0, ghost: true }),
  flam: () => ({ on: true, accent: false, roll: 0, flam: true }),
  drag: () => ({ on: true, accent: false, roll: 0, flam: 'drag' }),
  roll: (rollType) => ({ on: true, accent: false, roll: rollType }),
  cross: () => ({ on: true, accent: false, roll: 0, art: 'cross' }),
  rim: () => ({ on: true, accent: false, roll: 0, art: 'rim' }),
  bell: () => ({ on: true, accent: false, roll: 0, art: 'bell' }),
  erase: () => ({ on: false, accent: false, roll: 0 }),
}
const TOOL_GLYPHS = { hit: '●', accent: '>', ghost: '( )', flam: 'f', drag: 'd', roll: 'z', cross: '×', rim: 'rs', bell: '▲', erase: '⌫' }
// Articulation stamps only land on rows that support them.
const ART_TOOL_ROWS = { cross: 'snare', rim: 'snare', bell: 'ride' }

// Beat-value button in the ruler; click cycles through these four.
const TICK_CYCLE = ['quarter', 'eighth', 'triplet', 'sixteenth']

// Tempo goal: target bpm with a progress bar from the current best.
function GoalChip({ t, exId, journalVer, onChange }) {
  const stats = getTempoStats(exId)
  const goal = stats?.goal || 0
  const best = stats?.best || 0
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(goal || 120)
  const reached = goal > 0 && best >= goal
  const openEdit = () => { setDraft(goal || 120); setEditing(true) }
  if (!editing) {
    if (!goal) {
      return (
        <button className="chip chip-goal-add" onClick={openEdit}>🎯 {t('goalSet')}</button>
      )
    }
    return (
      <button className={'chip chip-goal num' + (reached ? ' is-reached' : '')} onClick={openEdit}
        title={t('goalTitle')}>
        🎯 {goal} {t('bpm')} {reached && '✓'}
        {!reached && (
          <span className="goal-bar"><span className="goal-fill" style={{ width: `${Math.min(100, (best / goal) * 100)}%` }} /></span>
        )}
      </button>
    )
  }
  return (
    <span className="chip chip-goal-edit">
      🎯
      <NumberStepper value={draft} min={30} max={260} step={5}
        onChange={setDraft} aria-label={t('goalTitle')} />
      <button className="goal-clear" title={t('goalClear')}
        onClick={() => { setTempoGoal(exId, 0); setEditing(false); onChange() }}>✕</button>
      <button className="goal-ok" onClick={() => { setTempoGoal(exId, draft); setEditing(false); onChange() }}>OK</button>
    </span>
  )
}

export default function PracticeView({
  t, lang, item, setItem, options, setOptions, vols, setVols, playing, step,
  loopRange, onLoopRange,
  progress, onProgress, onDuplicate, onBack, onSave, onExport, onNew, savedFlash,
  initialView = 'notes', onRegenerate, fav, onToggleFav, inSetlist, onToggleSetlist,
  clickSound, onClickSound,
}) {
  const editable = item.source === 'user'
  // Catalog items have no grid editing to land on; user items open in the
  // view the app asked for (grid when just created, notes when reopened).
  const startView = editable ? initialView : 'notes'
  const [view, setView] = useState(startView)
  useEffect(() => { setView(startView) }, [item.id, startView]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Edit history (structural edits only; bpm/name are continuous) ----
  const histRef = useRef({ undo: [], redo: [] })
  const itemRef = useRef(item)
  itemRef.current = item
  const [, bumpHist] = useState(0)
  useEffect(() => { histRef.current = { undo: [], redo: [] }; bumpHist((v) => v + 1) }, [item.id])
  const pushHistory = useCallback(() => {
    const h = histRef.current
    h.undo.push(cloneEx(itemRef.current))
    if (h.undo.length > 50) h.undo.shift()
    h.redo = []
    bumpHist((v) => v + 1)
  }, [])
  // Snapshot + apply: one undo step per discrete edit.
  const mutate = useCallback((fn) => { pushHistory(); setItem(fn) }, [pushHistory, setItem])
  const undo = useCallback(() => {
    const h = histRef.current
    const prev = h.undo.pop()
    if (!prev) return
    h.redo.push(cloneEx(itemRef.current))
    setItem(prev)
    bumpHist((v) => v + 1)
  }, [setItem])
  const redo = useCallback(() => {
    const h = histRef.current
    const next = h.redo.pop()
    if (!next) return
    h.undo.push(cloneEx(itemRef.current))
    setItem(next)
    bumpHist((v) => v + 1)
  }, [setItem])
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo() }
      else if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ---- Stamp palette + drag painting ----
  const [tool, setTool] = useState(null)
  const paintingRef = useRef(false)
  const stampFor = useCallback((toolId, rt) => (toolId === 'roll' ? STAMPS.roll(rt) : STAMPS[toolId]()), [])

  const per = item.rows[INSTRUMENTS[0]].length
  const layout = barLayout(item)
  const beats = layout.bars.flatMap((b) => b.beats)
  const beatStartSet = new Set(beats.map((b) => b.start))
  const beatNumOfStart = new Map(beats.map((b) => [b.start, b.beatInBar + 1]))
  const beatOfStart = new Map(beats.map((b) => [b.start, b]))
  const barStartSet = new Set(layout.bars.map((b) => b.startStep))
  const barNumOfStart = new Map(layout.bars.map((b) => [b.startStep, b.bar + 1]))
  const cat = CAT(catOf(item))
  const sig = sigOf(item)

  const setBpm = (b) => setItem((p) => ({ ...p, bpm: b }))
  const setSig = (s) => mutate((p) => resizeExercise(p, sigToTimeSignature(s), p.subdivision))
  // Global grid value ("whole song") — keeps each bar's own time signature.
  const setSub = (s) => mutate((p) => setAllBeatSubs(p, s))
  const setOneBeatSub = (b, s) => mutate((p) => setBeatSub(p, b, s))
  const cycleTick = (bt) => {
    const next = TICK_CYCLE[(TICK_CYCLE.indexOf(bt.sub) + 1) % TICK_CYCLE.length]
    setOneBeatSub(bt.globalBeat, next)
  }
  // Loop range: click a bar number to loop that bar; click another to extend;
  // click inside the range to clear it.
  const inLoop = (i) => loopRange && i >= loopRange.from && i <= loopRange.to
  const toggleLoopBar = (i) => onLoopRange?.((lr) => {
    if (!lr) return { from: i, to: i }
    if (i >= lr.from && i <= lr.to) return null
    return { from: Math.min(lr.from, i), to: Math.max(lr.to, i) }
  })

  // ---- Bar selection (click a bar number; shift+click extends) ----
  // Every structural bar edit acts on this range; the clipboard holds a list
  // of bar snapshots so multi-bar phrases copy/paste in one go.
  const [sel, setSel] = useState(null) // { from, to } inclusive
  const selAnchorRef = useRef(null)
  const [barClip, setBarClip] = useState(null)
  useEffect(() => { setSel(null); setBarClip(null) }, [item.id])
  const nBars = layout.bars.length
  // Drop a selection that a structural edit pushed past the last bar.
  useEffect(() => { if (sel && sel.from >= nBars) setSel(null) }, [sel, nBars])
  const inSel = (i) => sel && i >= sel.from && i <= sel.to
  const selectBar = (i, extend) => {
    if (extend && selAnchorRef.current != null) {
      const a = selAnchorRef.current
      setSel({ from: Math.min(a, i), to: Math.max(a, i) })
      return
    }
    if (sel && sel.from === i && sel.to === i) { setSel(null); selAnchorRef.current = null; return }
    selAnchorRef.current = i
    setSel({ from: i, to: i })
  }
  const selLen = sel ? sel.to - sel.from + 1 : 0
  const addBarBtn = () => mutate((p) => addBar(p))
  const insertEmptyBefore = () => sel && mutate((p) => insertBar(p, sel.from))
  // After an insert, scroll the grid to the last new bar so you see where the
  // phrase now ends (applied once the new layout has rendered).
  const revealBarRef = useRef(-1)
  const copySel = () => sel && setBarClip(barsSnapshot(itemRef.current, sel.from, sel.to))
  // Paste right after the selection (or at the end), then select the pasted bars.
  const pasteClip = () => {
    if (!barClip?.length) return
    const at = sel ? sel.to + 1 : nBars
    mutate((p) => insertBars(p, at, barClip))
    revealBarRef.current = at + barClip.length - 1
    selAnchorRef.current = at
    setSel({ from: at, to: at + barClip.length - 1 })
  }
  const dupSel = () => {
    if (!sel) return
    revealBarRef.current = sel.to + selLen
    mutate((p) => duplicateBars(p, sel.from, sel.to))
  }
  const repSel = (n) => {
    if (!sel) return
    revealBarRef.current = sel.to + selLen * n
    mutate((p) => repeatBars(p, sel.from, sel.to, n))
  }
  const delSel = () => {
    if (!sel || selLen >= nBars) return
    mutate((p) => removeBars(p, sel.from, sel.to))
    setSel(null)
  }
  const selIsLoop = sel && loopRange && loopRange.from === sel.from && loopRange.to === sel.to
  const loopSel = () => sel && onLoopRange?.(selIsLoop ? null : { from: sel.from, to: sel.to })
  // Meter of the selection: shown when every selected bar shares it.
  const selSig = (() => {
    if (!sel) return ''
    const sigs = new Set(layout.bars.slice(sel.from, sel.to + 1).map((b) => `${b.ts.beats}/${b.ts.unit}`))
    return sigs.size === 1 ? [...sigs][0] : ''
  })()
  const setSelTS = (s) => sel && mutate((p) => {
    let cur = p
    for (let i = sel.from; i <= sel.to; i++) cur = setBarTimeSignature(cur, i, sigToTimeSignature(s))
    return cur
  })

  // ---- Grid display prefs (per device) ----
  const ZOOMS = [14, 18, 22, 26, 32, 40]
  const [cellW, setCellW] = useState(() => {
    try { const v = Number(localStorage.getItem('drums2_gridzoom')); return ZOOMS.includes(v) ? v : 26 } catch { return 26 }
  })
  const [usedOnly, setUsedOnly] = useState(() => {
    try { return localStorage.getItem('drums2_gridused') === '1' } catch { return false }
  })
  useEffect(() => { try { localStorage.setItem('drums2_gridzoom', String(cellW)) } catch { /* ignore */ } }, [cellW])
  useEffect(() => { try { localStorage.setItem('drums2_gridused', usedOnly ? '1' : '0') } catch { /* ignore */ } }, [usedOnly])
  const zoomBy = (d) => setCellW((w) => ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(w) + d))])
  const usedRows = INSTRUMENTS.filter((k) => item.rows[k].some((c) => c.on))
  const shownRows = usedOnly && usedRows.length ? usedRows : INSTRUMENTS
  const hiddenCount = INSTRUMENTS.length - shownRows.length

  // Bar shortcuts in the grid: Ctrl/⌘ C·V·D, Delete, Esc. A ref keeps the
  // single listener pointed at the current selection/clipboard.
  const barKeysRef = useRef(null)
  barKeysRef.current = (e) => {
    if (view !== 'grid' || !editable) return
    const el = document.activeElement
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    if (mod && key === 'c' && sel && !String(window.getSelection?.() || '')) { e.preventDefault(); copySel() }
    else if (mod && key === 'v' && barClip?.length) { e.preventDefault(); pasteClip() }
    else if (mod && key === 'd' && sel) { e.preventDefault(); dupSel() }
    else if (!mod && (e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); delSel() }
    else if (e.key === 'Escape' && sel) setSel(null)
  }
  useEffect(() => {
    const onKey = (e) => barKeysRef.current?.(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Options card folds away while editing the grid (the editor is the focus);
  // the user can still open it.
  const [optsOpen, setOptsOpen] = useState(view !== 'grid')
  useEffect(() => { setOptsOpen(view !== 'grid') }, [view])
  // Section markers: label a bar, click the label to loop the whole section.
  const [secEditFor, setSecEditFor] = useState(null)
  const sectionLabelOf = (i) => getSections(item).find((sec) => sec.bar === i)?.label || ''
  const saveSection = (i, label) => { setSecEditFor(null); mutate((p) => setSectionLabel(p, i, label)) }
  const loopSection = (i) => { const r = sectionRange(item, i); if (r) onLoopRange?.(r) }
  const setBarTS = (i, s) => mutate((p) => setBarTimeSignature(p, i, sigToTimeSignature(s)))

  // Roll type currently authored (open/closed); also restamps existing rolls.
  const hasClosed = INSTRUMENTS.some((k) => item.rows[k].some((c) => c.roll === 'closed'))
  const rollType = hasClosed ? 'closed' : 'open'

  // Plain click cycles through every cell state the palette offers:
  // off -> hit -> accent -> ghost -> flam -> drag -> roll -> off
  const cycleCell = (k, i) => {
    mutate((prev) => {
    const rows = { ...prev.rows, [k]: prev.rows[k].map((c, idx) => {
      if (idx !== i) return c
      if (!c.on) return STAMPS.hit()
      if (!c.accent && !c.ghost && !c.flam && !c.roll) return STAMPS.accent()
      if (c.accent) return STAMPS.ghost()
      if (c.ghost) return STAMPS.flam()
      if (c.flam === true) return STAMPS.drag()
      if (c.flam === 'drag') return STAMPS.roll(rollType)
      return STAMPS.erase()
    }) }
    return { ...prev, rows }
    })
  }

  // Apply the selected stamp to one cell (no history push — the paint gesture
  // pushes one snapshot at pointerdown).
  const applyStamp = useCallback((k, i) => {
    if (ART_TOOL_ROWS[tool] && ART_TOOL_ROWS[tool] !== k) return // e.g. no bell on a kick
    const next = stampFor(tool, rollType)
    setItem((prev) => {
      const cur = prev.rows[k]?.[i]
      if (!cur) return prev
      const same = cur.on === next.on && cur.accent === next.accent && (cur.roll || 0) === (next.roll || 0)
        && (cur.flam || false) === (next.flam || false) && !!cur.ghost === !!next.ghost
        && (cur.art || null) === (next.art || null)
      if (same) return prev
      const rows = { ...prev.rows, [k]: prev.rows[k].map((c, idx) => (idx === i ? { ...next } : c)) }
      return { ...prev, rows }
    })
  }, [tool, rollType, setItem, stampFor]) // eslint-disable-line react-hooks/exhaustive-deps

  const cellFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y)
    const btn = el && el.closest ? el.closest('[data-cellk]') : null
    return btn ? { k: btn.dataset.cellk, i: Number(btn.dataset.celli) } : null
  }

  const onGridPointerDown = (e) => {
    if (!editable || !tool) return
    const c = cellFromPoint(e.clientX, e.clientY)
    if (!c) return
    e.preventDefault()
    pushHistory() // one undo step per paint gesture
    paintingRef.current = true
    applyStamp(c.k, c.i)
  }
  const onGridPointerMove = (e) => {
    if (!paintingRef.current) return
    const c = cellFromPoint(e.clientX, e.clientY)
    if (c) applyStamp(c.k, c.i)
  }
  useEffect(() => {
    const up = () => { paintingRef.current = false }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => { window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up) }
  }, [])

  const toggleRollType = (closed) => mutate((prev) => {
    const next = closed ? 'closed' : 'open'
    const rows = {}
    INSTRUMENTS.forEach((k) => { rows[k] = prev.rows[k].map((c) => (c.roll ? { ...c, roll: next } : c)) })
    return { ...prev, rows }
  })
  const cycleStick = (i) => mutate((prev) => {
    const next = prev.sticking[i] === '' ? 'R' : prev.sticking[i] === 'R' ? 'L' : ''
    return { ...prev, sticking: prev.sticking.map((s, idx) => (idx === i ? next : s)) }
  })
  const clearCells = () => mutate((prev) => {
    const rows = {}
    INSTRUMENTS.forEach((k) => { rows[k] = prev.rows[k].map(() => ({ on: false, accent: false, roll: 0 })) })
    return { ...prev, rows, sticking: prev.sticking.map(() => '') }
  })

  const tap = useTapTempo(useCallback((bpm) => setItem((p) => ({ ...p, bpm })), [setItem]))

  const [sharedFlash, setSharedFlash] = useState(false)
  // navigator.clipboard exists only in secure contexts (https/localhost) — over
  // LAN http fall back to the execCommand trick, then to a copyable prompt.
  const copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true } catch { /* no clipboard API */ }
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch { return false }
  }
  const shareLink = async () => {
    const url = await shareUrlFor(item)
    if (await copyText(url)) {
      setSharedFlash(true)
      setTimeout(() => setSharedFlash(false), 1500)
    } else {
      window.prompt(t('shareCopyManually'), url)
    }
  }

  // Performance mode: fullscreen notation for the music stand.
  const [perfMode, setPerfMode] = useState(false)
  const perfScrollRef = useRef(null)
  useEffect(() => {
    if (!perfMode) return
    const onKey = (e) => { if (e.key === 'Escape') setPerfMode(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [perfMode])
  useEffect(() => { setPerfMode(false) }, [item.id])
  // Auto-scroll the fullscreen notation so the playhead's line stays visible.
  const perfLineTopRef = useRef(-1)
  useEffect(() => {
    if (!perfMode || !playing) return
    const box = perfScrollRef.current
    const ph = box?.querySelector('.note-playhead')
    if (!box || !ph) return
    const top = ph.offsetTop
    if (top === perfLineTopRef.current) return
    perfLineTopRef.current = top
    const view = box.getBoundingClientRect()
    const phr = ph.getBoundingClientRect()
    if (phr.top < view.top + 8 || phr.bottom > view.bottom - 40) {
      ph.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [perfMode, playing, step])

  // Global sound settings (kit + mixer) live in a bottom sheet.
  const [soundOpen, setSoundOpen] = useState(false)
  // Re-render hook for tempo-goal edits (journal is outside React state).
  const [goalVer, setGoalVer] = useState(0)
  const bumpGoalVer = () => setGoalVer((v) => v + 1)

  // Print: relayout the notation to A4 width first, then open the dialog.
  const [printing, setPrinting] = useState(false)
  const printNotes = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setPrinting(false), 300)
    }, 350)
  }

  const localPlay = playing ? step : -1
  const barOfStep = []
  layout.bars.forEach((b) => { for (let s = 0; s < b.stepCount; s++) barOfStep.push(b.bar) })

  // Grid follows the playhead: when the playing bar leaves the visible part of
  // the horizontal scroller, bring it to the left edge (next to the labels).
  const seqScrollRef = useRef(null)
  const playBar = localPlay >= 0 ? barOfStep[localPlay] : -1
  useEffect(() => {
    if (view !== 'grid' || playBar < 0) return
    const sc = seqScrollRef.current
    const head = sc?.querySelector(`[data-barhead="${playBar}"]`)
    const label = sc?.querySelector('.seq-corner')
    if (!sc || !head) return
    const scr = sc.getBoundingClientRect()
    const hr = head.getBoundingClientRect()
    const labelW = label ? label.getBoundingClientRect().width : 0
    if (hr.left < scr.left + labelW || hr.right > scr.right) {
      sc.scrollTo({ left: sc.scrollLeft + hr.left - scr.left - labelW - 8, behavior: 'smooth' })
    }
  }, [view, playBar])

  useEffect(() => {
    const i = revealBarRef.current
    if (i < 0) return
    revealBarRef.current = -1
    const sc = seqScrollRef.current
    const head = sc?.querySelector(`[data-barhead="${i}"]`)
    if (!sc || !head) return
    const scr = sc.getBoundingClientRect()
    const hr = head.getBoundingClientRect()
    if (hr.right > scr.right || hr.left < scr.left) {
      sc.scrollTo({ left: sc.scrollLeft + hr.right - scr.right + 24, behavior: 'smooth' })
    }
  }, [nBars])

  // Bring the notation/grid into view when playback starts, so the playhead is
  // visible without scrolling past the controls.
  const playAreaRef = useRef(null)
  useEffect(() => {
    if (playing) playAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [playing])

  return (
    <div className={'practice' + (view === 'grid' ? ' is-grid' : '')} data-screen-label="Practice">
      <div className="prac-top">
        <button className="prac-back" onClick={onBack}><Icon name="back" className="ic" /><span>{t('backToLibrary')}</span></button>
      </div>

      <div className="prac-head">
        <div className="prac-titlewrap">
          {editable
            ? <input className="input prac-name-input" value={item.name} onChange={(e) => setItem((p) => ({ ...p, name: e.target.value }))} />
            : <h1 className="prac-name">{item.name}</h1>}
          <div className="prac-meta">
            {cat && <span className="chip"><span className="chip-dot" style={{ background: cat.hue }} />{cat.label[lang] || cat.label.en}</span>}
            <span className="chip">{t(`level_${levelOf(item)}`)}</span>
            <span className="chip num">{sig}</span>
            {(() => {
              const stats = getTempoStats(item.id)
              if (!stats?.best) return null
              return (
                <span className="chip chip-best num" title={t('prBestTitle')}>
                  ★ {stats.best} {t('bpm')}
                  <Sparkline history={stats.history} />
                </span>
              )
            })()}
            <GoalChip t={t} exId={item.id} journalVer={goalVer} onChange={bumpGoalVer} />
            {item.number != null && <span className="chip chip-source"><Icon name="bookmark" className="ic-xs" />#{item.number}</span>}
            {(item.tags || []).map((tg) => <span key={tg} className="chip chip-tag">#{t(`tag_${tg}`)}</span>)}
          </div>
        </div>
        <div className="prac-progress">
          <button className={'prog-btn prog-fav' + (fav ? ' is-on' : '')} onClick={onToggleFav} aria-pressed={!!fav}>
            <Icon name="star" className="ic" /><span>{t('favorite')}</span>
          </button>
          {onToggleSetlist && (
            <button className={'prog-btn prog-sl' + (inSetlist ? ' is-on' : '')} onClick={onToggleSetlist} aria-pressed={!!inSetlist}>
              <Icon name="library" className="ic" /><span>{inSetlist ? t('slInList') : t('slAdd')}</span>
            </button>
          )}
          <button className={'prog-btn' + (progress === 'practiced' ? ' is-on' : '')} onClick={() => onProgress(progress === 'practiced' ? 'none' : 'practiced')}>
            <Icon name="checkcircle" className="ic" /><span>{t('practiced')}</span>
          </button>
          <button className={'prog-btn prog-master' + (progress === 'mastered' ? ' is-on' : '')} onClick={() => onProgress(progress === 'mastered' ? 'none' : 'mastered')}>
            <Icon name="star" className="ic" /><span>{t('mastered')}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="prac-controls">
          <div className="tempo-block">
            <span className="field-label">{t('tempo')} · {t('bpm')}</span>
            <div className="tempo-row">
              <Slider value={item.bpm} min={30} max={260} onChange={setBpm} aria-label={t('tempo')} />
              <NumberStepper value={item.bpm} min={30} max={260} onChange={setBpm} />
            </div>
            <Button icon="tap" onClick={tap} style={{ alignSelf: 'start' }}>{t('tapTempo')}</Button>
          </div>
          <div className="meter-block">
            <div className="blk">
              <span className="field-label">{t('timeSig')}</span>
              {/* Multi-bar exercises are edited per bar (the bar strip) — a global
                  selector here would silently overwrite every bar's meter. */}
              {editable && layout.bars.length === 1
                ? <select className="select" value={sig} onChange={(e) => setSig(e.target.value)}>{TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                : <div className="static-field num">{layout.bars.length > 1 ? `${sig} · ${layout.bars.length} ${t('barsUnit')}` : sig}</div>}
            </div>
            <div className="blk">
              <span className="field-label">{t('subdivision')}</span>
              {/* Applies to every beat of every bar (per-bar meters untouched);
                  fine-tune per beat via the ruler or by dragging across cells. */}
              {editable ? <NotePicker value={item.subdivision} onChange={setSub} /> : <div className="static-field num">{t(item.subdivision)}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className={'card opts-card' + (optsOpen ? '' : ' is-folded')}>
        <button type="button" className="opts-toggle" onClick={() => setOptsOpen((v) => !v)} aria-expanded={optsOpen}>
          <span className="field-label">{t('options')}</span>
          <Icon name={optsOpen ? 'chevup' : 'chevdown'} className="ic-xs" />
        </button>
        {optsOpen && (<>
        <div className="toggles" style={{ marginTop: 'var(--s-2)' }}>
          <Switch checked={options.metroWith} onChange={(v) => setOptions((o) => ({ ...o, metroWith: v }))} label={t('playMetronomeWithExercise')} icon="metro" />
          <Switch checked={options.accentOne} onChange={(v) => setOptions((o) => ({ ...o, accentOne: v }))} label={t('accentFirst')} icon="accent" />
          <Switch checked={options.soundSubs} onChange={(v) => setOptions((o) => ({ ...o, soundSubs: v }))} label={t('countSubdivisions')} icon="notes" />
          {editable && <Switch checked={rollType === 'closed'} onChange={toggleRollType} label={t('closedRolls')} icon="grid" />}
        </div>
        <div style={{ marginTop: 'var(--s-4)', maxWidth: 420 }}>
          <div className="muted-line" style={{ marginBottom: 6 }}>{t('swing')}</div>
          <div className="volume-row">
            <Icon name="notes" className="v-ic" />
            <Slider value={options.swing || 0} min={0} max={100} onChange={(v) => setOptions((o) => ({ ...o, swing: v }))} aria-label={t('swing')} />
            <span className="v-val num">{options.swing || 0}%</span>
          </div>
        </div>

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        {(() => {
          const ramp = options.tempoRamp || { enabled: false, everyBars: 4, stepBpm: 5, maxBpm: 0 }
          const setRamp = (patch) => setOptions((o) => ({ ...o, tempoRamp: { ...ramp, ...patch } }))
          return (
            <div className="ramp-block">
              <Switch checked={ramp.enabled} onChange={(v) => setRamp({ enabled: v })} label={t('tempoRamp')} icon="metro" />
              <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('tempoRampHint')}</div>
              {ramp.enabled && (
                <div className="ramp-fields" style={{ marginTop: 'var(--s-3)' }}>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('everyBars')}</span>
                    <NumberStepper value={ramp.everyBars} min={1} max={64} onChange={(v) => setRamp({ everyBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('increaseBy')}</span>
                    <NumberStepper value={ramp.stepBpm} min={1} max={50} onChange={(v) => setRamp({ stepBpm: v })} />
                    <span className="ramp-cap">{t('bpm')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('maxTempo')}</span>
                    <NumberStepper value={ramp.maxBpm || 0} min={0} max={400} onChange={(v) => setRamp({ maxBpm: v })} />
                    <span className="ramp-cap">{ramp.maxBpm ? t('bpm') : t('noLimit')}</span>
                  </label>
                </div>
              )}
            </div>
          )
        })()}

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        {(() => {
          const gap = options.gapTrainer || { enabled: false, onBars: 2, offBars: 2 }
          const setGap = (patch) => setOptions((o) => ({ ...o, gapTrainer: { ...gap, ...patch } }))
          return (
            <div className="ramp-block">
              <Switch checked={gap.enabled} onChange={(v) => setGap({ enabled: v })} label={t('gapTrainer')} icon="metro" />
              <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('gapTrainerHint')}</div>
              {gap.enabled && (
                <div className="ramp-fields" style={{ marginTop: 'var(--s-3)' }}>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('clickOn')}</span>
                    <NumberStepper value={gap.onBars} min={1} max={16} onChange={(v) => setGap({ onBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                  <label className="ramp-field">
                    <span className="ramp-cap">{t('clickOff')}</span>
                    <NumberStepper value={gap.offBars} min={1} max={16} onChange={(v) => setGap({ offBars: v })} />
                    <span className="ramp-cap">{t('barsUnit')}</span>
                  </label>
                </div>
              )}
            </div>
          )
        })()}

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        {(() => {
          const ci = options.countIn || { enabled: false, bars: 1, mode: 'loop' }
          const setCI = (patch) => setOptions((o) => ({ ...o, countIn: { ...ci, ...patch } }))
          return (
            <div className="ramp-block">
              <Switch checked={ci.enabled} onChange={(v) => setCI({ enabled: v })} label={t('countIn')} icon="metro" />
              <div className="muted-line" style={{ margin: '6px 0 0' }}>{t('countInHint')}</div>
              {ci.enabled && (
                <>
                  <div className="ramp-fields" style={{ marginTop: 'var(--s-3)', alignItems: 'center' }}>
                    <label className="ramp-field">
                      <span className="ramp-cap">{t('countIn')}</span>
                      <NumberStepper value={ci.bars} min={1} max={4} onChange={(v) => setCI({ bars: v })} />
                      <span className="ramp-cap">{t('barsUnit')}</span>
                    </label>
                    <Segmented
                      options={[{ value: 'loop', label: t('countInModeLoop') }, { value: 'phrase', label: t('countInModePhrase') }]}
                      value={ci.mode} onChange={(v) => setCI({ mode: v })} />
                  </div>
                  <div className="ramp-fields" style={{ marginTop: 'var(--s-2)', alignItems: 'center' }}>
                    <span className="ramp-cap">{t('countInFeel')}</span>
                    <Segmented
                      options={[
                        { value: 'quarter', label: '1 2 3 4' },
                        { value: 'countoff', label: '1 2 1·2·3·4' },
                        { value: 'eighth', label: t('feelEighth') },
                        { value: 'sixteenth', label: t('feelSixteenth') },
                      ]}
                      value={ci.feel || 'quarter'} onChange={(v) => setCI({ feel: v })} />
                  </div>
                </>
              )}
            </div>
          )
        })()}

        <hr className="divider" style={{ margin: 'var(--s-5) 0' }} />
        <span className="field-label">{t('volumes')}</span>
        <div className="vol-pair" style={{ marginTop: 'var(--s-2)' }}>
          <div>
            <div className="muted-line" style={{ marginBottom: 6 }}>{t('exerciseVolume')}</div>
            <div className="volume-row"><Icon name="vol" className="v-ic" /><Slider value={vols.ex} min={0} max={200} onChange={(v) => setVols((s) => ({ ...s, ex: v }))} aria-label={t('exerciseVolume')} /><span className="v-val num">{vols.ex}%</span></div>
          </div>
          <div>
            <div className="muted-line" style={{ marginBottom: 6 }}>{t('metronomeVolume')}</div>
            <div className="volume-row"><Icon name="metro" className="v-ic" /><Slider value={vols.metro} min={0} max={200} onChange={(v) => setVols((s) => ({ ...s, metro: v }))} aria-label={t('metronomeVolume')} /><span className="v-val num">{vols.metro}%</span></div>
          </div>
        </div>
        <div style={{ marginTop: 'var(--s-3)' }}>
          <Button size="sm" icon="vol" onClick={() => setSoundOpen(true)}>{t('soundBtn')}</Button>
        </div>
        </>)}
      </div>

      <div className="view-bar">
        <Segmented accent options={[{ value: 'notes', label: t('notesView'), icon: 'notes' }, { value: 'grid', label: t('gridView'), icon: 'grid' }]} value={view} onChange={setView} />
        <div className="view-actions">
          {editable ? (
            <>
              <Button size="sm" icon="plus" onClick={onNew}>{t('newExercise')}</Button>
              <Button size="sm" icon="clear" onClick={clearCells}>{t('clear')}</Button>
              <Button size="sm" icon="download" onClick={onExport}>{t('export')}</Button>
              <Button size="sm" icon="upload" variant={sharedFlash ? 'accent' : 'default'} onClick={shareLink}>{sharedFlash ? t('shared_ok') : t('share')}</Button>
              {view === 'notes' && <Button size="sm" icon="chevup" onClick={() => setPerfMode(true)}>{t('perform')}</Button>}
              {view === 'notes' && <Button size="sm" icon="notes" onClick={printNotes}>{t('print')}</Button>}
              <Button size="sm" icon="save" variant={savedFlash ? 'accent' : 'default'} onClick={onSave}>{savedFlash ? t('saved_ok') : t('save')}</Button>
            </>
          ) : (
            <>
              {item.source === 'generated' && onRegenerate && (
                <Button size="sm" variant="accent" icon="plus" onClick={onRegenerate}>{t('newRhythm')}</Button>
              )}
              <Button size="sm" icon="download" onClick={onExport}>{t('export')}</Button>
              <Button size="sm" icon="upload" variant={sharedFlash ? 'accent' : 'default'} onClick={shareLink}>{sharedFlash ? t('shared_ok') : t('share')}</Button>
              {view === 'notes' && <Button size="sm" icon="chevup" onClick={() => setPerfMode(true)}>{t('perform')}</Button>}
              {view === 'notes' && <Button size="sm" icon="notes" onClick={printNotes}>{t('print')}</Button>}
              <Button size="sm" icon="copy" onClick={onDuplicate}>{t('duplicate')}</Button>
            </>
          )}
        </div>
      </div>

      {(view === 'notes') ? (
        <div ref={playAreaRef} className="print-area">
          <div className="print-head">{item.name} · {item.bpm} {t('bpm')} · {sig}</div>
          <div className="notation-wrap">
            <NotationView exercise={item} currentStep={localPlay}
              loopRange={loopRange} onBarClick={toggleLoopBar} barClickTitle={t('loopBarTitle')}
              onSectionClick={loopSection} />
          </div>
          {printing && (
            // Hidden print-only copy laid out at A4 width, so the on-screen
            // notation never reflows when the print dialog opens.
            <div className="print-notation" aria-hidden="true">
              <NotationView exercise={item} currentStep={-1} printWidth={660} />
            </div>
          )}
          <div className="notation-hint">
            {layout.bars.length > 1 ? `${t('loopNotesHint')} · ` : ''}{editable ? t('editInGridHint') : t('viewOnly')}
          </div>
        </div>
      ) : (
        <div className="seq" ref={playAreaRef}>
          {editable && (
            <div className="seq-tools">
              <div className="stamp-bar" role="toolbar" aria-label={t('tools')}>
                <div className="stamp-rows">
                  {[['hit', 'accent', 'ghost', 'flam', 'drag', 'roll'], ['cross', 'rim', 'bell', 'erase']].map((row, ri) => (
                    <div className="stamp-row" key={ri}>
                      {row.map((id) => (
                        <button key={id} className={'stamp' + (tool === id ? ' is-active' : '')}
                          title={t(`tool_${id}`)} aria-pressed={tool === id}
                          onClick={() => setTool(tool === id ? null : id)}>
                          <span className="stamp-glyph num">{TOOL_GLYPHS[id]}</span>
                          <span className="stamp-lbl">{t(`tool_${id}`)}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="grid-view-ctl">
                  <span className="zoom-ctl" role="group" aria-label={t('gridZoom')}>
                    <button className="bar-act" onClick={() => zoomBy(-1)} disabled={cellW === ZOOMS[0]} aria-label={t('zoomOut')} title={t('zoomOut')}>−</button>
                    <button className="bar-act" onClick={() => zoomBy(1)} disabled={cellW === ZOOMS[ZOOMS.length - 1]} aria-label={t('zoomIn')} title={t('zoomIn')}>+</button>
                  </span>
                  <button className={'stamp rows-toggle' + (usedOnly ? ' is-active' : '')} aria-pressed={usedOnly}
                    onClick={() => setUsedOnly((v) => !v)} title={t('hideEmptyRowsTitle')}>
                    {t('hideEmptyRows')}{usedOnly && hiddenCount > 0 ? ` (${hiddenCount})` : ''}
                  </button>
                </div>
                {/* Undo spans both stamp rows on the right. */}
                <Button size="sm" icon="back" className="stamp-undo" onClick={undo} disabled={!histRef.current.undo.length}>{t('undo')}</Button>
              </div>
              <div className={'sel-bar' + (sel ? ' is-active' : '')}>
                {sel ? (
                  <>
                    <span className="sel-what num">
                      {selLen === 1 ? `${t('bar')} ${sel.from + 1}` : `${t('barsSel')} ${sel.from + 1}–${sel.to + 1}`}
                    </span>
                    <Button size="sm" icon="copy" onClick={copySel} title="Ctrl+C">{t('copyBars')}</Button>
                    {barClip?.length > 0 && <Button size="sm" icon="upload" onClick={pasteClip} title="Ctrl+V">{t('pasteAfter')}</Button>}
                    <Button size="sm" icon="plus" onClick={dupSel} title="Ctrl+D">{t('dupBars')}</Button>
                    <span className="sel-rep" role="group" aria-label={t('repeatBars')}>
                      <span className="sel-cap">{t('repeatBars')}</span>
                      {[2, 4, 8].map((n) => (
                        <button key={n} className="bar-act num" onClick={() => repSel(n - 1)} title={t('repeatBarsTitle').replace('{n}', n)}>×{n}</button>
                      ))}
                    </span>
                    <select className="select bar-ts" value={selSig} onChange={(e) => setSelTS(e.target.value)} aria-label={t('timeSig')} title={t('timeSig')}>
                      {!selSig && <option value="">—</option>}
                      {TIME_SIGS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <Button size="sm" variant={selIsLoop ? 'accent' : 'default'} onClick={loopSel}>{t('loopSel')}</Button>
                    <Button size="sm" icon="bookmark" onClick={() => setSecEditFor(secEditFor === sel.from ? null : sel.from)}>{t('sectionEdit')}</Button>
                    <Button size="sm" icon="plus" onClick={insertEmptyBefore}>{t('insertBefore')}</Button>
                    {selLen < nBars && <Button size="sm" icon="trash" onClick={delSel} title="Delete">{t('delete')}</Button>}
                    <button className="sel-clear" onClick={() => setSel(null)} aria-label={t('clearSel')} title={`${t('clearSel')} (Esc)`}>✕</button>
                  </>
                ) : (
                  <>
                    <span className="sel-hint">{t('selectBarsHint')}</span>
                    {barClip?.length > 0 && <Button size="sm" icon="upload" onClick={pasteClip}>{t('pasteAtEnd')}</Button>}
                    <Button size="sm" icon="plus" onClick={addBarBtn}>{t('addBar')}</Button>
                  </>
                )}
              </div>
              <div className="stamp-hint-line">{tool ? t('paintHint') : t('cycleHint')}</div>
            </div>
          )}
          <div className="seq-scroll" ref={seqScrollRef} style={{ '--cell-w': `${cellW}px` }}>
            <div className="seq-ruler seq-barhead-row">
              <div className="seq-rowlabel seq-corner" />
              <div className="seq-barheads">
                {layout.bars.map((bar) => (
                  <div key={bar.bar} data-barhead={bar.bar}
                    className={'seq-barhead' + (inSel(bar.bar) ? ' is-sel' : '') + (inLoop(bar.bar) ? ' is-loop' : '')}
                    style={{ gridColumn: `${bar.startStep + 1} / span ${bar.stepCount}` }}>
                    {editable ? (
                      <button className="bar-tag num" onClick={(e) => selectBar(bar.bar, e.shiftKey)}
                        title={t('selectBarTitle')} aria-pressed={!!inSel(bar.bar)}>
                        {bar.bar + 1}
                      </button>
                    ) : (
                      <button className="bar-tag num" onClick={() => toggleLoopBar(bar.bar)} title={t('loopBarTitle')}>{bar.bar + 1}</button>
                    )}
                    {secEditFor === bar.bar ? (
                      <input className="bar-sec-input" autoFocus defaultValue={sectionLabelOf(bar.bar)}
                        placeholder={t('sectionPlaceholder')} maxLength={24}
                        onBlur={(e) => saveSection(bar.bar, e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setSecEditFor(null) }} />
                    ) : sectionLabelOf(bar.bar) ? (
                      <button className="bar-sec" onClick={() => loopSection(bar.bar)}
                        onDoubleClick={() => editable && setSecEditFor(bar.bar)} title={t('sectionLoopTitle')}>
                        {sectionLabelOf(bar.bar)}
                      </button>
                    ) : null}
                    {(bar.ts.beats !== layout.bars[0].ts.beats || bar.ts.unit !== layout.bars[0].ts.unit || bar.bar === 0) && (
                      <span className="seq-barhead-ts num">{bar.ts.beats}/{bar.ts.unit}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="seq-ruler"><div className="seq-rowlabel seq-corner" />
              <div className="ticks">{Array.from({ length: per }).map((_, i) => {
                const cls = 'tick' + (beatStartSet.has(i) ? ' beat' : '') + (barStartSet.has(i) ? ' bar-start' : '') + (localPlay === i ? ' play' : '')
                const bt = beatOfStart.get(i)
                if (bt && editable) {
                  return (
                    <button key={i} type="button" className={cls + ' tick-btn'} title={t('tickTitle')}
                      onClick={() => cycleTick(bt)}>
                      {bt.beatInBar + 1}
                      <span className="tick-glyph"><NoteGlyph kind={bt.sub} /></span>
                    </button>
                  )
                }
                return <div key={i} className={cls}>{bt ? beatNumOfStart.get(i) : '·'}</div>
              })}</div>
            </div>
            <div className="seq-grid" onPointerDown={onGridPointerDown} onPointerMove={onGridPointerMove}
              style={{ touchAction: tool ? 'none' : undefined }}>
              {shownRows.map((k) => (
                <div className="seq-row" key={k}>
                  <div className="seq-rowlabel"><span className="dot" style={{ background: INSTR_COLORS[k] }} />{t(k)}</div>
                  <div className="seq-cells">
                    {item.rows[k].map((cell, i) => (
                      <button key={i} disabled={!editable} aria-label={t(k) + ' ' + (i + 1)}
                        data-cellk={k} data-celli={i}
                        className={['cell', cell.roll ? 'roll' : cell.flam ? 'flam' : cell.art ? 'art' : cell.ghost ? 'ghost' : cell.accent ? 'accent' : cell.on ? 'on' : '', beatStartSet.has(i) ? 'beat-start' : '', barStartSet.has(i) ? 'bar-start' : '', localPlay === i ? 'play-col' : '', inSel(barOfStep[i]) ? 'in-sel' : '', !editable ? 'ro' : ''].join(' ')}
                        onClick={() => editable && !tool && cycleCell(k, i)}>{(() => {
                          const mark = cell.roll ? 'z' : cell.flam === 'drag' ? 'd' : cell.flam ? 'f' : cell.art === 'cross' ? '×' : cell.art === 'rim' ? 'rs' : cell.art === 'bell' ? '▲' : cell.ghost ? '()' : ''
                          // Absolutely positioned so the text can never widen the
                          // cell's grid track (the row is sized max-content).
                          return mark ? <span className="cell-mark">{mark}</span> : null
                        })()}</button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="seq-row">
                <div className="seq-rowlabel" style={{ fontWeight: 700, color: 'var(--text)' }}>{t('sticking')}</div>
                <div className="seq-cells">
                  {item.sticking.map((s, i) => (
                    <button key={i} disabled={!editable}
                      className={['cell', 'stick', s, beatStartSet.has(i) ? 'beat-start' : '', barStartSet.has(i) ? 'bar-start' : '', localPlay === i ? 'play-col' : '', inSel(barOfStep[i]) ? 'in-sel' : '', !editable ? 'ro' : ''].join(' ')}
                      onClick={() => editable && cycleStick(i)}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend explains the grid symbols — irrelevant on the notes view. */}
      {view === 'grid' && (
      <div className="cell-legend">
        <span className="cl-title">{t('legendTitle')}</span>
        <span className="cl-item"><span className="cl-sw cell on" />{t('legendHit')}</span>
        <span className="cl-item"><span className="cl-sw cell accent" />{t('legendAccent')}</span>
        <span className="cl-item"><span className="cl-sw cell ghost">()</span>{t('legendGhost')}</span>
        <span className="cl-item"><span className="cl-sw cell flam">f</span>{t('legendFlam')}</span>
        <span className="cl-item"><span className="cl-sw cell flam">d</span>{t('legendDrag')}</span>
        <span className="cl-item"><span className="cl-sw cell roll">z</span>{t('legendRoll')}</span>
        <span className="cl-item"><span className="cl-sw cell art">×</span>{t('legendCross')}</span>
        <span className="cl-item"><span className="cl-sw cell art">rs</span>{t('legendRim')}</span>
        <span className="cl-item"><span className="cl-sw cell art">▲</span>{t('legendBell')}</span>
        <span className="cl-item"><span className="cl-rl">R / L</span>{t('legendSticking')}</span>
      </div>
      )}

      {perfMode && (
        <div className="perf-overlay">
          <div className="perf-head">
            <span className="perf-title">{item.name}</span>
            <span className="perf-meta num">{item.bpm} {t('bpm')} · {sig}</span>
            <button className="perf-close" onClick={() => setPerfMode(false)} aria-label={t('close')}>✕</button>
          </div>
          <div className="perf-notes" ref={perfScrollRef}>
            <NotationView exercise={item} currentStep={localPlay} zoom={1.5}
              loopRange={loopRange} onBarClick={toggleLoopBar} barClickTitle={t('loopBarTitle')}
              onSectionClick={loopSection} />
          </div>
        </div>
      )}

      <SoundSheet t={t} open={soundOpen} onClose={() => setSoundOpen(false)} vols={vols} setVols={setVols}
        clickSound={clickSound} onClickSound={onClickSound} />
    </div>
  )
}
