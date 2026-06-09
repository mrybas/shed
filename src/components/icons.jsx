// Small inline SVG icons (use currentColor so they recolor with button state).

function Notehead({ cx, cy }) {
  return <ellipse cx={cx} cy={cy} rx="3.5" ry="2.6" transform={`rotate(-20 ${cx} ${cy})`} />
}

// Musical note icons for subdivision picker.
export function NoteIcon({ type }) {
  const fill = { fill: 'currentColor', stroke: 'none' }
  switch (type) {
    case 'quarter':
      return (
        <svg className="note-icon" viewBox="0 0 14 26" height="24" {...fill}>
          <Notehead cx={5} cy={19} />
          <rect x="8" y="4" width="1.6" height="15.5" />
        </svg>
      )
    case 'eighth':
      return (
        <svg className="note-icon" viewBox="0 0 28 26" height="24" {...fill}>
          <Notehead cx={5} cy={19} />
          <Notehead cx={19} cy={19} />
          <rect x="8" y="4" width="1.6" height="15.5" />
          <rect x="22" y="4" width="1.6" height="15.5" />
          <rect x="8" y="4" width="15.6" height="3.4" />
        </svg>
      )
    case 'sixteenth':
      return (
        <svg className="note-icon" viewBox="0 0 28 26" height="24" {...fill}>
          <Notehead cx={5} cy={19} />
          <Notehead cx={19} cy={19} />
          <rect x="8" y="4" width="1.6" height="15.5" />
          <rect x="22" y="4" width="1.6" height="15.5" />
          <rect x="8" y="4" width="15.6" height="3" />
          <rect x="8" y="8.5" width="15.6" height="3" />
        </svg>
      )
    case 'triplet':
      return (
        <svg className="note-icon" viewBox="0 0 34 26" height="24" {...fill}>
          <text x="17" y="6" fontSize="9" textAnchor="middle" fontStyle="italic" fontWeight="bold">3</text>
          <Notehead cx={5} cy={20} />
          <Notehead cx={16} cy={20} />
          <Notehead cx={27} cy={20} />
          <rect x="8" y="9" width="1.6" height="11.5" />
          <rect x="19" y="9" width="1.6" height="11.5" />
          <rect x="30" y="9" width="1.6" height="11.5" />
          <rect x="8" y="9" width="23.6" height="3" />
        </svg>
      )
    default:
      return null
  }
}

export function AccentIcon() {
  return (
    <svg className="ui-icon" viewBox="0 0 18 18" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3,4 14,9 3,14" />
    </svg>
  )
}

export function MetronomeIcon() {
  return (
    <svg className="ui-icon" viewBox="0 0 20 20" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 17 L10 3 L14 17 Z" />
      <line x1="4.5" y1="13" x2="15.5" y2="13" />
      <line x1="10" y1="13" x2="14" y2="6" />
    </svg>
  )
}
