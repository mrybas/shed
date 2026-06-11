import { useEffect, useRef, useState } from 'react'
import { Segmented, Icon } from '../ui.jsx'
import { getAudioContext, getMaster, resumeAudio } from '../../audio/AudioEngine.js'
import { click } from '../../audio/click.js'
import { saveClickSample, deleteClickSample, listClickSamples, MAX_SAMPLE_BYTES } from '../../audio/clickSamples.js'

// Click sound picker: built-in synth blip or the user's own samples (live
// shows, matching a recording click, …). Two slots: the accented "1" and the
// regular beat; with only one uploaded it covers both at different volumes.
export default function ClickSoundCard({ t, value, onChange }) {
  const [slots, setSlots] = useState({}) // { accent: {name}, normal: {name} }
  const [error, setError] = useState('')
  const inputRefs = { accent: useRef(null), normal: useRef(null) }

  useEffect(() => {
    let alive = true
    listClickSamples().then((s) => { if (alive) setSlots(s) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const upload = async (slot, file) => {
    setError('')
    if (!file) return
    if (file.size > MAX_SAMPLE_BYTES) { setError(t('clickTooBig')); return }
    try {
      await resumeAudio()
      const buf = await file.arrayBuffer()
      await saveClickSample(slot, file.name, buf)
      setSlots((s) => ({ ...s, [slot]: { name: file.name } }))
      onChange('sample') // uploading implies "use it"
    } catch {
      setError(t('clickBadFile'))
    }
  }

  const remove = async (slot) => {
    await deleteClickSample(slot)
    setSlots((s) => {
      const next = { ...s }
      delete next[slot]
      if (!next.accent && !next.normal) onChange('synth')
      return next
    })
  }

  const preview = async (kind) => {
    await resumeAudio()
    const ctx = getAudioContext()
    click(ctx, ctx.currentTime + 0.02, getMaster(), kind, 1)
  }

  const hasAny = !!(slots.accent || slots.normal)

  return (
    <div className="clicksound">
      <Segmented accent value={value === 'sample' ? 'sample' : 'synth'}
        onChange={(v) => { if (v === 'synth' || hasAny) onChange(v) }}
        options={[
          { value: 'synth', label: t('clickSynth') },
          { value: 'sample', label: t('clickSamples') },
        ]} />
      <div className="cs-slots">
        {['accent', 'normal'].map((slot) => (
          <div className="cs-slot" key={slot}>
            <span className="cs-cap">{t(slot === 'accent' ? 'clickSlotAccent' : 'clickSlotNormal')}</span>
            <input ref={inputRefs[slot]} type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg" style={{ display: 'none' }}
              onChange={(e) => { upload(slot, e.target.files?.[0]); e.target.value = '' }} />
            {slots[slot] ? (
              <span className="cs-file">
                <button className="cs-play" onClick={() => preview(slot === 'accent' ? 'accent' : 'normal')}
                  aria-label={t('clickPreview')} title={t('clickPreview')}>
                  <Icon name="play" className="ic-xs" />
                </button>
                <span className="cs-name" title={slots[slot].name}>{slots[slot].name}</span>
                <button className="cs-del" onClick={() => remove(slot)} aria-label={t('delete')} title={t('delete')}>✕</button>
              </span>
            ) : (
              <button className="cs-upload" onClick={() => inputRefs[slot].current?.click()}>
                <Icon name="upload" className="ic-xs" /> {t('clickUpload')}
              </button>
            )}
          </div>
        ))}
      </div>
      {!hasAny && <p className="muted-line">{t('clickHint')}</p>}
      {error && <p className="cs-error">{error}</p>}
    </div>
  )
}
