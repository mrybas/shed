import { useEffect } from 'react'

// Spacebar ALWAYS toggles play/stop — except while typing in a text field.
// We blur the focused control so Space never re-triggers the last clicked
// button/switch/select instead of the transport.
export function useSpacebar(onToggle) {
  useEffect(() => {
    const handler = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      const el = document.activeElement
      const tag = el?.tagName
      const type = (el?.getAttribute && el.getAttribute('type')) || ''
      const isTextField =
        tag === 'TEXTAREA' ||
        el?.isContentEditable ||
        (tag === 'INPUT' && ['text', 'number', 'search', 'email', 'tel', 'url', 'password'].includes(type))
      if (isTextField) return
      e.preventDefault()
      if (el && typeof el.blur === 'function') el.blur()
      onToggle()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggle])
}
