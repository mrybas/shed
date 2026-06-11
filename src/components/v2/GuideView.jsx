import { useEffect, useState } from 'react'
import { Icon } from '../ui.jsx'
import { GUIDE, searchGuide } from '../../data/guide.js'

const imgSrc = (key) => `${import.meta.env.BASE_URL || '/'}guide/${key}.webp`

function GuideItem({ item }) {
  return (
    <div className="gd-item">
      {item.img && (
        <img className="gd-img" src={imgSrc(item.img)} alt="" loading="lazy" />
      )}
      <h3 className="gd-item-title">{item.title}</h3>
      <p className="gd-item-body">{item.body}</p>
    </div>
  )
}

// The in-app manual. Sections live in the MAIN sidebar (desktop) / chips
// (mobile); scrolling reports the active section back up via onActiveChange.
export default function GuideView({ t, target, onActiveChange }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(GUIDE[0].id)
  const results = searchGuide(q)
  const searching = q.trim().length > 0

  // Scroll-spy: the section crossing the upper band of the viewport is active.
  useEffect(() => {
    if (searching) return undefined
    const sections = [...document.querySelectorAll('.gd-section')]
    const onScroll = () => {
      let cur = sections[0]?.id
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= 140) cur = el.id
      }
      // Fully scrolled: the last (short) section may never cross the band.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8) {
        cur = sections[sections.length - 1]?.id
      }
      if (cur) {
        const id = cur.replace('guide-', '')
        setActive(id)
        onActiveChange?.(id)
      }
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    // Lazy images can shift the layout without a scroll event — re-check slowly.
    const tick = setInterval(onScroll, 1000)
    return () => { window.removeEventListener('scroll', onScroll); clearInterval(tick) }
  }, [searching, onActiveChange])

  useEffect(() => {
    if (!target) return
    const el = document.getElementById(`guide-${target}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [target])

  const jump = (id) => {
    setQ('')
    requestAnimationFrame(() => {
      document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="guide" data-screen-label="Guide">
      <div className="gd-head">
        <h1 className="page-title">{t('guideTitle')}</h1>
        <div className="gd-search lib2-search">
          <Icon name="search" className="ic" />
          <input value={q} placeholder={t('guideSearch')} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="search-clear" onClick={() => setQ('')}><Icon name="close" className="ic-xs" /></button>}
        </div>
      </div>
      {/* Mobile (no app sidebar): horizontal section chips with the active one lit. */}
      <nav className="gd-toc" aria-label={t('guideToc')}>
        {GUIDE.map((sec) => (
          <button key={sec.id} className={'gd-toc-item' + (active === sec.id ? ' is-active' : '')} onClick={() => jump(sec.id)}>
            <Icon name={sec.icon} className="ic" /><span>{sec.title}</span>
          </button>
        ))}
      </nav>

      <div className="gd-content">
        {searching ? (
          results.length === 0 ? (
            <p className="muted-line">{t('guideNoResults')}</p>
          ) : (
            results.map(({ section, item }, i) => (
              <div key={i} className="gd-result">
                <button className="gd-crumb" onClick={() => jump(section.id)}>
                  <Icon name={section.icon} className="ic-xs" /> {section.title}
                </button>
                <GuideItem item={item} />
              </div>
            ))
          )
        ) : (
          GUIDE.map((sec) => (
            <section key={sec.id} className="gd-section" id={`guide-${sec.id}`}>
              <h2 className="gd-sec-title"><Icon name={sec.icon} className="ic" /> {sec.title}</h2>
              {sec.items.map((item, i) => <GuideItem key={i} item={item} />)}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
