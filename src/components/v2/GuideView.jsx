import { useEffect, useState } from 'react'
import { Icon } from '../ui.jsx'
import { GUIDE, searchGuide } from '../../data/guide.js'

const imgSrc = (key) => `${import.meta.env.BASE_URL || '/'}guide/${key}.webp`

function GuideItem({ item }) {
  return (
    <div className="gd-item" id={item.anchor}>
      {item.img && (
        <img className="gd-img" src={imgSrc(item.img)} alt="" loading="lazy" />
      )}
      <h3 className="gd-item-title">{item.title}</h3>
      <p className="gd-item-body">{item.body}</p>
    </div>
  )
}

// The in-app manual: sticky table of contents, search across every item,
// anchored sections (What's new links land here via `target`).
export default function GuideView({ t, target }) {
  const [q, setQ] = useState('')
  const results = searchGuide(q)
  const searching = q.trim().length > 0

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
      <h1 className="page-title">{t('guideTitle')}</h1>
      <div className="gd-search lib2-search">
        <Icon name="search" className="ic" />
        <input value={q} placeholder={t('guideSearch')} onChange={(e) => setQ(e.target.value)} />
        {q && <button className="search-clear" onClick={() => setQ('')}><Icon name="close" className="ic-xs" /></button>}
      </div>

      <div className="gd-layout">
        <nav className="gd-toc" aria-label={t('guideToc')}>
          {GUIDE.map((sec) => (
            <button key={sec.id} className="gd-toc-item" onClick={() => jump(sec.id)}>
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
    </div>
  )
}
