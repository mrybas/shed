import { useState, useMemo, useRef } from 'react'
import { Icon, Button } from '../ui.jsx'
import { CATEGORIES, CAT, catOf, sigOf, levelOf, LEVELS, getCatalogExercises } from '../../data/catalogV2.js'

const LEVEL_HUES = {
  beginner: 'oklch(0.72 0.17 150)',
  intermediate: 'oklch(0.78 0.14 78)',
  advanced: 'oklch(0.65 0.18 25)',
}
import { stepsPerBeat, INSTRUMENTS } from '../../model/exercise.js'
import { getRecentExercises } from '../../model/progress.js'

function PatternStrip({ item }) {
  const mult = stepsPerBeat(item.subdivision)
  const per = item.rows.snare.length
  const cells = []
  for (let i = 0; i < Math.min(per, 16); i++) {
    const on = INSTRUMENTS.some((k) => item.rows[k]?.[i]?.on)
    const acc = INSTRUMENTS.some((k) => item.rows[k]?.[i]?.accent)
    cells.push(<span key={i} className={'ps-cell' + (on ? ' on' : '') + (acc ? ' acc' : '') + (i % mult === 0 ? ' beat' : '')} />)
  }
  return <div className="pattern-strip" title="Rhythm preview" aria-hidden="true">{cells}</div>
}

function ProgressDot({ state }) {
  if (state === 'mastered') return <span className="prog-ind master" title="mastered"><Icon name="star" className="ic-xs" /></span>
  if (state === 'practiced') return <span className="prog-ind done" title="practiced"><Icon name="check" className="ic-xs" /></span>
  return null
}

function ExRow({ t, lang, item, prog, onOpen, onExport, onDelete, fav, onFav }) {
  const cat = CAT(catOf(item))
  const hasActions = onExport || onDelete || onFav
  return (
    <button className={'exrow' + (hasActions ? ' has-actions' : '')} onClick={() => onOpen(item)}>
      <span className="exrow-cat" style={{ background: cat ? cat.hue : 'var(--text-3)' }} />
      <span className="exrow-main">
        <span className="exrow-name">{item.name}<ProgressDot state={prog} /></span>
        <span className="exrow-sub">
          <span className="level-dot" style={{ background: LEVEL_HUES[levelOf(item)] }} title={t(`level_${levelOf(item)}`)} />
          <span className="chip-sm">{cat ? (cat.label[lang] || cat.label.en) : ''}</span>
          {item.number != null && <span className="exrow-source"><Icon name="bookmark" className="ic-xs" />#{item.number}</span>}
        </span>
      </span>
      <PatternStrip item={item} />
      <span className="exrow-meta num">{sigOf(item)} · {item.bpm}</span>
      {hasActions ? (
        <span className="exrow-actions">
          {onFav && <span role="button" tabIndex={0} className={'rowact star' + (fav ? ' is-on' : '')} aria-label={t('favorite')} onClick={(e) => { e.stopPropagation(); onFav(item.id) }}><Icon name="star" className="ic" /></span>}
          {onExport && <span role="button" tabIndex={0} className="rowact" aria-label={t('export')} onClick={(e) => { e.stopPropagation(); onExport(item) }}><Icon name="download" className="ic" /></span>}
          {onDelete && <span role="button" tabIndex={0} className="rowact del" aria-label={t('delete')} onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}><Icon name="trash" className="ic" /></span>}
        </span>
      ) : (
        <span className="exrow-go"><Icon name="chevright" className="ic" /></span>
      )}
    </button>
  )
}

function FilterChip({ active, onClick, children }) {
  return <button className={'fchip' + (active ? ' is-active' : '')} onClick={onClick}>{children}</button>
}

const TAG_FILTERS = ['singles', 'doubles', 'triples', 'quads', 'rudiment', 'groove']

export default function LibraryView({ t, lang, saved, progressMap, onOpen, onNew, onImport, onExportItem, onExportAll, onDeleteSaved, route, onRoute, onGenerate, favs = [], onToggleFav }) {
  const section = route?.section || 'home'
  const activeCat = route?.cat || null
  const go = (s, c = null) => onRoute?.({ section: s, cat: c })
  const [query, setQuery] = useState('')
  const [fTag, setFTag] = useState(new Set())
  const [fProg, setFProg] = useState(new Set())
  const [fLevel, setFLevel] = useState(new Set())
  const fileRef = useRef(null)

  const toggle = (set, setter, v) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n) }
  const anyFilter = fTag.size || fProg.size || fLevel.size || query.trim()
  const allItems = useMemo(() => [...getCatalogExercises(), ...saved], [saved])

  const byId = useMemo(() => new Map(allItems.map((i) => [i.id, i])), [allItems])
  const favItems = favs.map((id) => byId.get(id)).filter(Boolean)
  const recentItems = useMemo(() => getRecentExercises()
    .map((r) => byId.get(r.exId)).filter(Boolean).slice(0, 6), [byId])

  const filtered = useMemo(() => allItems.filter((it) => {
    if (section === 'cat' && activeCat && catOf(it) !== activeCat) return false
    const q = query.trim().toLowerCase()
    if (q && !it.name.toLowerCase().includes(q) && !String(it.number ?? '').includes(q) && !(it.sticking || []).join('').toLowerCase().includes(q)) return false
    if (fTag.size && !(it.tags || []).some((x) => fTag.has(x))) return false
    if (fLevel.size && !fLevel.has(levelOf(it))) return false
    if (fProg.size) { const p = progressMap[it.id] || 'none'; if (!fProg.has(p)) return false }
    return true
  }), [allItems, section, activeCat, query, fTag, fLevel, fProg, progressMap])

  const catCount = (id) => allItems.filter((i) => catOf(i) === id).length
  const showList = section === 'cat' || section === 'saved' || (section === 'home' && anyFilter)
  const listItems = section === 'saved' ? saved : filtered
  const clearAll = () => { setQuery(''); setFTag(new Set()); setFProg(new Set()); setFLevel(new Set()) }

  return (
    <div className="library2" data-screen-label="Library">
      <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />

      <div className="lib2-head">
        <div className="crumbs">
          <button className="crumb" onClick={() => { go('home'); clearAll() }}>{t('library')}</button>
          {section === 'cat' && activeCat && <><Icon name="chevright" className="ic-xs crumb-sep" /><span className="crumb cur">{CAT(activeCat)?.label[lang] || CAT(activeCat)?.label.en}</span></>}
          {section === 'saved' && <><Icon name="chevright" className="ic-xs crumb-sep" /><span className="crumb cur">{t('saved')}</span></>}
        </div>
        <div className="lib2-search">
          <Icon name="search" className="ic" />
          <input value={query} placeholder={t('searchPlaceholder')} onChange={(e) => setQuery(e.target.value)} />
          {query && <button className="search-clear" onClick={() => setQuery('')}><Icon name="close" className="ic-xs" /></button>}
        </div>
      </div>

      <div className="filters-row">
        <div className="fgroup"><span className="fg-label">{t('tags')}</span>
          {TAG_FILTERS.map((tg) => <FilterChip key={tg} active={fTag.has(tg)} onClick={() => toggle(fTag, setFTag, tg)}>#{t(`tag_${tg}`)}</FilterChip>)}
        </div>
        <div className="fgroup"><span className="fg-label">{t('levels')}</span>
          {LEVELS.map((lv) => (
            <FilterChip key={lv} active={fLevel.has(lv)} onClick={() => toggle(fLevel, setFLevel, lv)}>
              <span className="level-dot" style={{ background: LEVEL_HUES[lv] }} />{t(`level_${lv}`)}
            </FilterChip>
          ))}
        </div>
        <div className="fgroup"><span className="fg-label">{t('progress')}</span>
          <FilterChip active={fProg.has('mastered')} onClick={() => toggle(fProg, setFProg, 'mastered')}>{t('mastered')}</FilterChip>
          <FilterChip active={fProg.has('practiced')} onClick={() => toggle(fProg, setFProg, 'practiced')}>{t('practiced')}</FilterChip>
        </div>
        {anyFilter ? <button className="clear-filters" onClick={clearAll}><Icon name="close" className="ic-xs" />{t('clearFilters')}</button> : null}
      </div>

      {section === 'home' && !anyFilter && (
        <div className="lib2-home">
          {favItems.length > 0 && (
            <>
              <div className="sec-label">{t('favorites')}</div>
              <div className="ex-list shelf">
                {favItems.map((it) => <ExRow key={'f' + it.id} t={t} lang={lang} item={it} prog={progressMap[it.id] || 'none'} onOpen={onOpen} fav onFav={onToggleFav} />)}
              </div>
            </>
          )}
          {recentItems.length > 0 && (
            <>
              <div className="sec-label">{t('recentTitle')}</div>
              <div className="ex-list shelf">
                {recentItems.map((it) => <ExRow key={'r' + it.id} t={t} lang={lang} item={it} prog={progressMap[it.id] || 'none'} onOpen={onOpen} fav={favs.includes(it.id)} onFav={onToggleFav} />)}
              </div>
            </>
          )}
          <div className="sec-label">{t('catBrowse')}</div>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button key={c.id} className="cat-card" onClick={() => go('cat', c.id)}>
                <span className="cat-icon" style={{ background: c.hue }}><Icon name={c.icon} className="ic" /></span>
                <span className="cat-name">{c.label[lang] || c.label.en}</span>
                <span className="cat-count num">{catCount(c.id)} {t('exercisesCount')}</span>
              </button>
            ))}
          </div>
          {onGenerate && (
            <>
              <div className="sec-label" style={{ marginTop: 'var(--s-5)' }}>{t('sightReading')}</div>
              <p className="muted-line gen-hint">{t('sightReadingHint')}</p>
              <div className="cat-grid">
                {[['beginner', 'oklch(0.72 0.17 150)'], ['intermediate', 'oklch(0.78 0.14 78)'], ['advanced', 'oklch(0.70 0.155 38)']].map(([lv, hue]) => (
                  <button key={lv} className="cat-card" onClick={() => onGenerate(lv)}>
                    <span className="cat-icon" style={{ background: hue }}><Icon name="notes" className="ic" /></span>
                    <span className="cat-name">{t(`level_${lv}`)}</span>
                    <span className="cat-count">{t('sightReadingNew')}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="sec-row">
            <span className="sec-label">{t('collections')}</span>
            <div className="sec-actions">
              <Button size="sm" icon="upload" onClick={() => fileRef.current?.click()}>{t('import')}</Button>
              <Button size="sm" variant="accent" icon="plus" onClick={onNew}>{t('newExercise')}</Button>
            </div>
          </div>
          <div className="coll-grid">
            <button className="coll-card coll-create" onClick={onNew}>
              <span className="coll-icon create"><Icon name="plus" className="ic" /></span>
              <span className="coll-body"><span className="coll-name">{t('createExercise')}</span></span>
            </button>
            <button className="coll-card" onClick={() => go('saved')}>
              <span className="coll-icon"><Icon name="bookmark" className="ic" /></span>
              <span className="coll-body"><span className="coll-name">{t('saved')}</span><span className="coll-meta num">{saved.length} {t('exercisesCount')}</span></span>
              <Icon name="chevright" className="ic coll-go" />
            </button>
          </div>
        </div>
      )}

      {showList && (
        section === 'saved' && saved.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="bookmark" className="ic" /></div>
            <h2>{t('noSaved')}</h2>
            <div className="empty-actions">
              <Button icon="upload" onClick={() => fileRef.current?.click()}>{t('import')}</Button>
              <Button variant="accent" icon="plus" onClick={onNew}>{t('newExercise')}</Button>
            </div>
          </div>
        ) : (
          <div className="exlist">
            <div className="exlist-head">
              <div className="exlist-count num">{listItems.length} {t('results')}</div>
              {section === 'saved' && (
                <div className="sec-actions">
                  {saved.length > 0 && onExportAll && (
                    <Button size="sm" icon="download" onClick={onExportAll}>{t('exportAll')}</Button>
                  )}
                  <Button size="sm" icon="upload" onClick={() => fileRef.current?.click()}>{t('import')}</Button>
                  <Button size="sm" variant="accent" icon="plus" onClick={onNew}>{t('newExercise')}</Button>
                </div>
              )}
            </div>
            {listItems.length === 0 ? <div className="muted-line" style={{ padding: '24px 4px' }}>{t('noResults')}</div>
              : listItems.map((it) => <ExRow key={it.id} t={t} lang={lang} item={it} prog={progressMap[it.id] || 'none'} onOpen={onOpen}
                fav={favs.includes(it.id)} onFav={onToggleFav}
                onExport={section === 'saved' ? onExportItem : undefined} onDelete={section === 'saved' ? onDeleteSaved : undefined} />)}
          </div>
        )
      )}
    </div>
  )
}
