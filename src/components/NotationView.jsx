import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import {
  Renderer, Stave, StaveNote, Voice, Formatter, Beam, Tuplet, Articulation, Annotation, Modifier, Dot, Tremolo, StaveTie,
  GraceNote, GraceNoteGroup, Parenthesis,
} from 'vexflow'
import { buildNotationData } from '../model/notation.js'

const LINE_H = 128
const STAFF_Y = 34
const PLAYHEAD_TOP = 10
const PLAYHEAD_H = 110
const BOTTOM_PAD = 24
const COMFY_NOTE_PX = 30
const CLEF_W = 42
const TS_W = 30

export default function NotationView({ exercise, currentStep, loopRange, onBarClick, barClickTitle, printWidth = 0 }) {
  const wrapRef = useRef(null)
  const hostRef = useRef(null)
  const [meta, setMeta] = useState([])
  const [barBoxes, setBarBoxes] = useState([]) // clickable per-bar zones
  const [dims, setDims] = useState({ w: 0, h: LINE_H })
  const [containerWidth, setContainerWidth] = useState(0)
  const [error, setError] = useState('')

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const update = () => setContainerWidth(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const sig = JSON.stringify({
    r: exercise.rows, s: exercise.sticking, t: exercise.timeSignature, d: exercise.subdivision, b: exercise.bars,
  })

  const layoutWidth = printWidth || containerWidth

  useEffect(() => {
    const host = hostRef.current
    if (!host || layoutWidth === 0) return
    host.innerHTML = ''
    setError('')

    try {
      const data = buildNotationData(exercise)

      // --- Lay bars out into lines that fit the available width ---------------
      const barWidth = (bm, firstOfLine, showsTs) => {
        const notes = Math.max(bm.beatCount * 40, bm.stepCount * COMFY_NOTE_PX)
        return 16 + notes + (firstOfLine ? CLEF_W : 0) + (showsTs ? TS_W : 0)
      }
      // Decide whether each bar restates the time signature (first bar or change).
      const showsTsFor = data.barsMeta.map((bm, i) => i === 0 || bm.timeSig !== data.barsMeta[i - 1].timeSig)

      const avail = layoutWidth - 16
      const lines = []
      let cur = []
      let curW = 0
      data.barsMeta.forEach((bm, i) => {
        const firstOfLine = cur.length === 0
        const w = barWidth(bm, firstOfLine, showsTsFor[i])
        if (cur.length && curW + w > avail) { lines.push(cur); cur = []; curW = 0 }
        const firstNow = cur.length === 0
        const w2 = barWidth(bm, firstNow, showsTsFor[i])
        cur.push({ bm, showsTs: showsTsFor[i], w: w2 })
        curW += w2
      })
      if (cur.length) lines.push(cur)

      const width = layoutWidth

      const makeNote = (td) => {
        const sn = new StaveNote({ keys: td.keys, duration: td.rest ? td.durKind + 'r' : td.durKind, stemDirection: 1 })
        if (td.dots) Dot.buildAndAttach([sn])
        if (!td.rest && td.ghost) {
          // Ghost note: parentheses around the notehead.
          try { Parenthesis.buildAndAttach([sn]) } catch { /* ignore */ }
        }
        if (!td.rest && td.flam) {
          // Flam: a single slashed grace note; drag (ruff): two beamed 16th graces.
          try {
            if (td.flam === 'drag') {
              const graces = [
                new GraceNote({ keys: [td.keys[0]], duration: '16' }),
                new GraceNote({ keys: [td.keys[0]], duration: '16' }),
              ]
              const group = new GraceNoteGroup(graces, false)
              if (group.beamNotes) group.beamNotes()
              sn.addModifier(group, 0)
            } else {
              const grace = new GraceNote({ keys: [td.keys[0]], duration: '8', slash: true })
              sn.addModifier(new GraceNoteGroup([grace], false), 0)
            }
          } catch { /* ignore */ }
        }
        if (!td.rest && td.roll) {
          try { sn.addModifier(new Tremolo(td.roll === 'closed' ? 3 : 2), 0) } catch { /* ignore */ }
        }
        if (!td.rest && td.accent) sn.addModifier(new Articulation('a>').setPosition(Modifier.Position.ABOVE), 0)
        if (!td.rest && td.open) {
          const o = new Annotation('o')
          o.setVerticalJustification(Annotation.VerticalJustify.TOP)
          sn.addModifier(o, 0)
        }
        if (td.sticking) {
          const a = new Annotation(td.sticking)
          a.setVerticalJustification(Annotation.VerticalJustify.BOTTOM)
          a.setFont('Arial', 11, 'bold')
          sn.addModifier(a, 0)
        }
        return sn
      }

      const stepMeta = new Array(data.totalSteps)
      const boxes = []

      lines.forEach((lineBars, line) => {
        const lineTop = line * LINE_H
        // Each line is its own SVG block so print page breaks fall between
        // lines instead of tearing a staff in half.
        const lineDiv = document.createElement('div')
        lineDiv.className = 'vf-line'
        lineDiv.style.height = `${line === lines.length - 1 ? LINE_H + BOTTOM_PAD : LINE_H}px`
        host.appendChild(lineDiv)
        const renderer = new Renderer(lineDiv, Renderer.Backends.SVG)
        renderer.resize(width, LINE_H + BOTTOM_PAD)
        const ctx = renderer.getContext()
        const totalW = lineBars.reduce((t, x) => t + x.w, 0)
        const scale = (layoutWidth - 16) / totalW
        let x = 8

        lineBars.forEach((entry, idxInLine) => {
          const { bm, showsTs } = entry
          const firstOfLine = idxInLine === 0
          const staveW = entry.w * scale
          const stave = new Stave(x, STAFF_Y, staveW)
          if (firstOfLine) stave.addClef('percussion')
          if (showsTs) stave.addTimeSignature(bm.timeSig)
          stave.setContext(ctx).draw()

          // Notes for this bar.
          const barBeats = data.beatsData.slice(bm.firstBeatIndex, bm.firstBeatIndex + bm.beatCount)
          const notes = []
          const tds = []
          const beatGroups = []
          barBeats.forEach((bd) => {
            const group = []
            bd.tickables.forEach((td) => {
              const sn = makeNote(td)
              notes.push(sn); tds.push(td); group.push({ note: sn, td })
            })
            beatGroups.push({ notes: group, tuplet: bd.tuplet })
          })

          const beams = []
          const tuplets = []
          beatGroups.forEach(({ notes: g, tuplet }) => {
            if (!tuplet) return
            const tn = g.map((y) => y.note)
            const groups = tuplet.groups || 1
            const per = tn.length / groups
            for (let gi = 0; gi < groups; gi++) {
              const slice = tn.slice(gi * per, (gi + 1) * per)
              if (slice.length) tuplets.push(new Tuplet(slice, { numNotes: tuplet.num, notesOccupied: tuplet.inTimeOf, ratioed: false }))
            }
          })

          if (data.beamAcross) {
            let run = []
            let runDur = null
            const flush = () => {
              if (run.length >= 2) {
                const beam = new Beam(run)
                if (runDur === '16' && run.length > 4) {
                  const breaks = []
                  for (let k = 4; k < run.length; k += 4) breaks.push(k - 1)
                  try { beam.breakSecondaryAt(breaks) } catch { /* ignore */ }
                }
                beams.push(beam)
              }
              run = []; runDur = null
            }
            tds.forEach((td, idx) => {
              const ok = !td.rest && (td.durKind === '8' || td.durKind === '16')
              if (!ok) { flush(); return }
              if (runDur && runDur !== td.durKind) flush()
              run.push(notes[idx]); runDur = td.durKind
            })
            flush()
          } else {
            beatGroups.forEach(({ notes: g }) => {
              const beamable = g.filter((y) => !y.td.rest && (y.td.durKind === '8' || y.td.durKind === '16')).map((y) => y.note)
              if (beamable.length >= 2) beams.push(new Beam(beamable))
            })
          }

          const ties = []
          tds.forEach((td, idx) => {
            if (td.roll && idx + 1 < notes.length) {
              ties.push(new StaveTie({ first_note: notes[idx], last_note: notes[idx + 1], first_indices: [0], last_indices: [0] }))
            }
          })

          const voice = new Voice({ numBeats: bm.ts.beats, beatValue: bm.ts.unit }).setStrict(false)
          voice.addTickables(notes)
          const modW = (firstOfLine ? CLEF_W : 0) + (showsTs ? TS_W : 0) + 20
          new Formatter({ softmaxFactor: 18 }).joinVoices([voice]).format([voice], Math.max(40, staveW - modW))
          voice.draw(ctx, stave)
          beams.forEach((bm2) => bm2.setContext(ctx).draw())
          tuplets.forEach((tp) => tp.setContext(ctx).draw())
          ties.forEach((tie) => tie.setContext(ctx).draw())

          const staveRight = stave.getX() + stave.getWidth()
          const xs = notes.map((sn) => sn.getAbsoluteX())
          tds.forEach((td, idx) => {
            const nx = idx + 1 < xs.length ? xs[idx + 1] : staveRight
            for (let s = 0; s < td.span; s++) {
              stepMeta[td.startStep + s] = { x: xs[idx] - 12, top: lineTop + PLAYHEAD_TOP, width: Math.max(20, nx - xs[idx]) }
            }
          })

          boxes.push({ bar: bm.bar, x, top: lineTop + PLAYHEAD_TOP, width: staveW, height: PLAYHEAD_H })
          x += staveW
        })
      })

      setBarBoxes(boxes)
      setMeta(stepMeta)
      setDims({ w: width, h: lines.length * LINE_H + BOTTOM_PAD })
    } catch (e) {
      console.error('Notation render failed', e)
      setError(String(e?.message || e))
    }
  }, [sig, layoutWidth]) // eslint-disable-line react-hooks/exhaustive-deps

  const hl = currentStep >= 0 && currentStep < meta.length ? meta[currentStep] : null
  // Clickable bar zones (loop selection) only make sense with several bars.
  const zones = onBarClick && barBoxes.length > 1 ? barBoxes : []
  const inLoop = (bar) => loopRange && bar >= loopRange.from && bar <= loopRange.to

  return (
    <div className="notation" ref={wrapRef}>
      {error && <p className="error">notation error: {error}</p>}
      <div className="notation-inner" style={{ width: dims.w || '100%', height: dims.h }}>
        {zones.map((b) => (
          <button key={b.bar + ':' + b.x} type="button" title={barClickTitle}
            className={'note-barzone' + (inLoop(b.bar) ? ' is-loop' : '')}
            style={{ left: `${b.x}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` }}
            onClick={() => onBarClick(b.bar)} aria-label={`bar ${b.bar + 1}`} />
        ))}
        {hl && (
          <div className="note-playhead" style={{ left: `${hl.x}px`, top: `${hl.top}px`, width: `${hl.width}px`, height: `${PLAYHEAD_H}px` }} />
        )}
        <div ref={hostRef} className="vf-host" />
      </div>
    </div>
  )
}
