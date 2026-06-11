// v2 design-system UI atoms (ported from the design handoff `controls.jsx`).
// Class names map 1:1 to the design CSS (app.css). Pure presentational components.
import { useState, useEffect } from 'react'

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

const ICON_PATHS = {
  play: <polygon points="7 5 19 12 7 19" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2.2" fill="currentColor" stroke="none" />,
  plus: <g {...P}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
  trash: <g {...P}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></g>,
  save: <g {...P}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></g>,
  upload: <g {...P}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></g>,
  download: <g {...P}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></g>,
  clear: <g {...P}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11l4 4M14 11l-4 4" /></g>,
  tap: <g {...P}><path d="M9 11.5V5a1.8 1.8 0 0 1 3.6 0v6" /><path d="M12.6 11V8.5a1.7 1.7 0 0 1 3.4 0V12" /><path d="M16 10.5a1.7 1.7 0 0 1 3.4 0V15a6 6 0 0 1-6 6h-1.5a5 5 0 0 1-4-2l-3-4a1.8 1.8 0 0 1 2.8-2.2L9 16" /></g>,
  accent: <g {...P}><polyline points="6 5 18 12 6 19" /></g>,
  metro: <g {...P}><path d="M8 21h8" /><path d="M9 21 12 4l3 17" /><path d="M7.5 14h9" /><line x1="12" y1="8" x2="16" y2="6" /></g>,
  grid: <g {...P}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></g>,
  notes: <g {...P}><circle cx="6" cy="18" r="2.5" /><circle cx="17" cy="15.5" r="2.5" /><path d="M8.5 18V6l11-2v11.5" /></g>,
  sun: <g {...P}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g>,
  moon: <path {...P} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  vol: <g {...P}><polygon points="4 9 8 9 13 4 13 20 8 15 4 15" fill="currentColor" stroke="none" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 7a7 7 0 0 1 0 10" /></g>,
  chevdown: <polyline {...P} points="6 9 12 15 18 9" />,
  chevup: <polyline {...P} points="6 15 12 9 18 15" />,
  search: <g {...P}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></g>,
  check: <polyline {...P} points="20 6 9 17 4 12" />,
  checkcircle: <g {...P}><circle cx="12" cy="12" r="9" /><polyline points="8.5 12 11 14.5 15.5 9.5" /></g>,
  star: <polygon {...P} points="12 3 14.6 8.6 20.5 9.3 16 13.4 17.3 19.3 12 16.2 6.7 19.3 8 13.4 3.5 9.3 9.4 8.6" />,
  library: <g {...P}><rect x="3" y="3" width="7" height="18" rx="1.5" /><rect x="14" y="3" width="7" height="11" rx="1.5" /><line x1="14" y1="18" x2="21" y2="18" /><line x1="14" y1="21" x2="21" y2="21" /></g>,
  chevright: <polyline {...P} points="9 6 15 12 9 18" />,
  back: <g {...P}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></g>,
  close: <g {...P}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>,
  bookmark: <path {...P} d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  copy: <g {...P}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></g>,
  github: <path fill="currentColor" stroke="none" d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.34 1.12 2.91.85.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.05 10.05 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />,
}

export function Icon({ name, className = 'ic' }) {
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{ICON_PATHS[name] || null}</svg>
}

const head = (cx, cy, ink) => <ellipse cx={cx} cy={cy} rx="3.1" ry="2.3" transform={`rotate(-20 ${cx} ${cy})`} fill={ink} />

export function NoteGlyph({ kind }) {
  const ink = 'currentColor'
  switch (kind) {
    case 'quarter':
      return <svg viewBox="0 0 24 30"><g>{head(9, 22, ink)}<rect x="11.4" y="6" width="1.7" height="16" fill={ink} /></g></svg>
    case 'eighth':
      return <svg viewBox="0 0 24 30"><g>{head(6, 23, ink)}{head(15, 23, ink)}<rect x="8.4" y="7" width="1.6" height="16" fill={ink} /><rect x="17.4" y="7" width="1.6" height="16" fill={ink} /><rect x="8.4" y="7" width="10.6" height="2.4" fill={ink} /></g></svg>
    case 'triplet':
      return <svg viewBox="0 0 24 30"><g>{head(4.5, 23, ink)}{head(11, 23, ink)}{head(17.5, 23, ink)}<rect x="6.9" y="8" width="1.4" height="15" fill={ink} /><rect x="13.4" y="8" width="1.4" height="15" fill={ink} /><rect x="19.9" y="8" width="1.4" height="15" fill={ink} /><rect x="6.9" y="8" width="14.4" height="2.1" fill={ink} /><text x="12" y="6" fontSize="7" fontWeight="700" textAnchor="middle" fill={ink} fontFamily="monospace">3</text></g></svg>
    case 'sixteenth':
      return <svg viewBox="0 0 24 30"><g>{head(6, 23, ink)}{head(15, 23, ink)}<rect x="8.4" y="6" width="1.6" height="17" fill={ink} /><rect x="17.4" y="6" width="1.6" height="17" fill={ink} /><rect x="8.4" y="6" width="10.6" height="2.2" fill={ink} /><rect x="8.4" y="10" width="10.6" height="2.2" fill={ink} /></g></svg>
    default:
      return null
  }
}

export function Button({ variant = 'default', size, icon, children, className = '', ...rest }) {
  const cls = ['btn',
    variant === 'accent' && 'btn-accent',
    variant === 'ghost' && 'btn-ghost',
    variant === 'danger' && 'btn-danger',
    size === 'sm' && 'btn-sm', className].filter(Boolean).join(' ')
  return <button className={cls} {...rest}>{icon && <Icon name={icon} />}{children}</button>
}

export function IconButton({ icon, label, ...rest }) {
  return <button className="iconbtn" aria-label={label} title={label} {...rest}><Icon name={icon} /></button>
}

export function Switch({ checked, onChange, label, icon }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="thumb" /></span>
      {icon && <Icon name={icon} className="switch-ic" />}
      <span className="switch-label">{label}</span>
    </label>
  )
}

export function Segmented({ options, value, onChange, accent = false }) {
  return (
    <div className={'seg' + (accent ? ' seg-accent' : '')} role="tablist">
      {options.map((o) => {
        const v = typeof o === 'object' ? o.value : o
        const lbl = typeof o === 'object' ? o.label : o
        return (
          <button key={v} role="tab" aria-selected={value === v}
            className={'seg-item' + (value === v ? ' is-active' : '')}
            onClick={() => onChange(v)}>{o.icon && <Icon name={o.icon} />}<span>{lbl}</span></button>
        )
      })}
    </div>
  )
}

export function NotePicker({ value, onChange }) {
  const opts = ['quarter', 'eighth', 'triplet', 'sixteenth']
  return (
    <div className="seg notepick">
      {opts.map((k) => (
        <button key={k} className={'seg-item' + (value === k ? ' is-active' : '')}
          onClick={() => onChange(k)} aria-label={k}><NoteGlyph kind={k} /></button>
      ))}
    </div>
  )
}

export function Slider({ value, min, max, step = 1, onChange, 'aria-label': al }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="range">
      <input type="range" min={min} max={max} step={step} value={value} aria-label={al}
        style={{ '--_fill': pct + '%' }}
        onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

export function NumberStepper({ value, min, max, onChange }) {
  const clamp = (v) => Math.max(min, Math.min(max, v))
  // Local text state so the user can freely clear/type (e.g. "113") without the
  // field clamping every keystroke. Commit (clamp) on blur / Enter.
  const [text, setText] = useState(String(value))
  useEffect(() => { setText(String(value)) }, [value])

  const commit = () => {
    const n = parseInt(text, 10)
    if (Number.isNaN(n)) { setText(String(value)); return }
    const c = clamp(n)
    setText(String(c))
    if (c !== value) onChange(c)
  }

  return (
    <div className="stepper">
      <input
        className="num" type="text" inputMode="numeric" value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d]/g, '')
          setText(t)
          const n = parseInt(t, 10)
          if (!Number.isNaN(n) && n >= min && n <= max) onChange(n) // live-apply only when in range
        }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      />
      <div className="step-btns">
        <button aria-label="increase" onClick={() => onChange(clamp(value + 1))}><Icon name="chevup" className="ic" /></button>
        <button aria-label="decrease" onClick={() => onChange(clamp(value - 1))}><Icon name="chevdown" className="ic" /></button>
      </div>
    </div>
  )
}

export function Transport({ playing, onToggle, label }) {
  return (
    <button className={'transport' + (playing ? ' is-playing' : '')} onClick={onToggle} aria-label={label}>
      <Icon name={playing ? 'stop' : 'play'} />
      <span className="label">{label}</span>
    </button>
  )
}
