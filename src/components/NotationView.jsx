import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import {
  Renderer, Stave, StaveNote, Voice, Formatter, Beam, Tuplet, Articulation, Annotation, Modifier, Dot, Tremolo, StaveTie,
} from 'vexflow'
import { buildNotationData } from '../model/notation.js'

const LINE_H = 128
const STAFF_Y = 34
const PLAYHEAD_TOP = 10
const PLAYHEAD_H = 110
const BOTTOM_PAD = 24
const COMFY_NOTE_PX = 30

function beatsPerLine(beats, limit) {
  const max = Math.min(Math.max(1, limit), beats)
  for (let d = max; d >= 1; d--) if (beats % d === 0) return d
  return 1
}

export default function NotationView({ exercise, currentStep }) {
  const wrapRef = useRef(null)
  const hostRef = useRef(null)
  const [meta, setMeta] = useState([])
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
    r: exercise.rows, s: exercise.sticking, t: exercise.timeSignature, d: exercise.subdivision,
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host || containerWidth === 0) return
    host.innerHTML = ''
    setError('')

    try {
      const data = buildNotationData(exercise)
      const spb = data.maxSpb

      // How many beats fit across the available width at a comfortable note
      // spacing. On narrow screens this drops to 1–2, so the exercise wraps onto
      // more staves instead of overflowing horizontally.
      const maxByWidth = Math.floor((containerWidth - 64) / (spb * COMFY_NOTE_PX))
      const target = Math.max(1, Math.min(data.beats, maxByWidth))
      const bpl = beatsPerLine(data.beats, target)
      const numLines = Math.ceil(data.beats / bpl)

      const naturalW = 110 + bpl * spb * 30
      const width = Math.max(containerWidth, naturalW)
      const staveWidth = width - 16

      const renderer = new Renderer(host, Renderer.Backends.SVG)
      renderer.resize(width, numLines * LINE_H + BOTTOM_PAD)
      const ctx = renderer.getContext()

      const makeNote = (td) => {
        const sn = new StaveNote({
          keys: td.keys,
          duration: td.rest ? td.durKind + 'r' : td.durKind,
          stemDirection: 1,
        })
        if (td.dots) Dot.buildAndAttach([sn])
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

      for (let line = 0; line < numLines; line++) {
        const beatStart = line * bpl
        const beatEnd = Math.min(beatStart + bpl, data.beats)
        const beatsThisLine = beatEnd - beatStart
        const lineTop = line * LINE_H
        const isFirst = line === 0

        const stave = new Stave(8, lineTop + STAFF_Y, staveWidth)
        if (isFirst) stave.addClef('percussion').addTimeSignature(data.timeSig)
        stave.setContext(ctx).draw()

        const lineNotes = []
        const lineTds = []
        const beatGroups = []
        for (let b = beatStart; b < beatEnd; b++) {
          const group = []
          data.beatsData[b].tickables.forEach((td) => {
            const sn = makeNote(td)
            lineNotes.push(sn); lineTds.push(td); group.push({ note: sn, td })
          })
          beatGroups.push({ notes: group, tuplet: data.beatsData[b].tuplet })
        }

        const beams = []
        const tuplets = []
        // Tuplet brackets (per beat; a sextuplet = two triplet brackets).
        beatGroups.forEach(({ notes: g, tuplet }) => {
          if (!tuplet) return
          const notes = g.map((x) => x.note)
          const groups = tuplet.groups || 1
          const per = notes.length / groups
          for (let gi = 0; gi < groups; gi++) {
            const slice = notes.slice(gi * per, (gi + 1) * per)
            if (slice.length) tuplets.push(new Tuplet(slice, { numNotes: tuplet.num, notesOccupied: tuplet.inTimeOf, ratioed: false }))
          }
        })
        // Beaming: rolls beam across beats (whole roll under one beam), grouped by
        // note value and broken by rests; everything else beams per beat.
        if (data.beamAcross) {
          let run = []
          let runDur = null
          const flush = () => {
            if (run.length >= 2) {
              const beam = new Beam(run)
              // Keep the primary beam continuous but break the secondary (16th)
              // beam every 4 notes, so it reads visually as groups of four.
              if (runDur === '16' && run.length > 4) {
                const breaks = []
                for (let k = 4; k < run.length; k += 4) breaks.push(k - 1) // break after every 4th note
                try { beam.breakSecondaryAt(breaks) } catch { /* ignore */ }
              }
              beams.push(beam)
            }
            run = []; runDur = null
          }
          lineTds.forEach((td, idx) => {
            const ok = !td.rest && (td.durKind === '8' || td.durKind === '16')
            if (!ok) { flush(); return }
            if (runDur && runDur !== td.durKind) flush()
            run.push(lineNotes[idx]); runDur = td.durKind
          })
          flush()
        } else {
          beatGroups.forEach(({ notes: g }) => {
            const beamable = g.filter((x) => !x.td.rest && (x.td.durKind === '8' || x.td.durKind === '16')).map((x) => x.note)
            if (beamable.length >= 2) beams.push(new Beam(beamable))
          })
        }

        // Rolls: tie the rolled note to its release (the next note in the line).
        const ties = []
        lineTds.forEach((td, idx) => {
          if (td.roll && idx + 1 < lineNotes.length) {
            ties.push(new StaveTie({ first_note: lineNotes[idx], last_note: lineNotes[idx + 1], first_indices: [0], last_indices: [0] }))
          }
        })

        const voice = new Voice({ numBeats: beatsThisLine, beatValue: data.unit }).setStrict(false)
        voice.addTickables(lineNotes)
        // Higher softmaxFactor = spacing follows note duration more strongly, so
        // triplet/sextuplet notes cluster tighter than the straight notes.
        new Formatter({ softmaxFactor: 18 }).joinVoices([voice]).format([voice], staveWidth - (isFirst ? 120 : 30))
        voice.draw(ctx, stave)
        beams.forEach((bm) => bm.setContext(ctx).draw())
        tuplets.forEach((tp) => tp.setContext(ctx).draw())
        ties.forEach((tie) => tie.setContext(ctx).draw())

        const staveRight = stave.getX() + stave.getWidth()
        const xs = lineNotes.map((sn) => sn.getAbsoluteX())
        lineTds.forEach((td, idx) => {
          const x = xs[idx]
          const nextX = idx + 1 < xs.length ? xs[idx + 1] : staveRight
          for (let s = 0; s < td.span; s++) {
            stepMeta[td.startStep + s] = { x: x - 12, top: lineTop + PLAYHEAD_TOP, width: Math.max(20, nextX - x) }
          }
        })
      }

      setMeta(stepMeta)
      setDims({ w: width, h: numLines * LINE_H + BOTTOM_PAD })
    } catch (e) {
      console.error('Notation render failed', e)
      setError(String(e?.message || e))
    }
  }, [sig, containerWidth]) // eslint-disable-line react-hooks/exhaustive-deps

  const hl = currentStep >= 0 && currentStep < meta.length ? meta[currentStep] : null

  return (
    <div className="notation" ref={wrapRef}>
      {error && <p className="error">notation error: {error}</p>}
      <div className="notation-inner" style={{ width: dims.w || '100%', height: dims.h }}>
        {hl && (
          <div className="note-playhead" style={{ left: `${hl.x}px`, top: `${hl.top}px`, width: `${hl.width}px`, height: `${PLAYHEAD_H}px` }} />
        )}
        <div ref={hostRef} className="vf-host" />
      </div>
    </div>
  )
}
