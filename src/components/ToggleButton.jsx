// A pill toggle with an icon and label that shows its on/off state.
export default function ToggleButton({ active, onToggle, icon, title, children }) {
  return (
    <button
      type="button"
      className={`toggle-btn ${active ? 'active' : ''}`}
      aria-pressed={active}
      title={title}
      onClick={() => onToggle(!active)}
    >
      <span className="toggle-icon">{icon}</span>
      {children && <span className="toggle-label">{children}</span>}
    </button>
  )
}
