import { useState } from 'react'
import { Slider, Button, Icon } from '../ui.jsx'
import { INSTRUMENTS } from '../../model/exercise.js'
import { KIT_NAMES, getKit, setKit } from '../../audio/drumSynths.js'

// Global sound settings in a bottom sheet: drum kit choice + per-instrument
// mixer. Both are device-level settings, not exercise properties — the kit
// lives in the audio module (drums2_kit), the mixer in vols.mixer (OPTS_KEY).
export default function SoundSheet({ t, open, onClose, vols, setVols }) {
  const [kit, setKitName] = useState(getKit())
  if (!open) return null

  const pickKit = (name) => { setKit(name); setKitName(name) }
  const mixVal = (inst) => vols.mixer?.[inst] ?? 100
  const setMix = (inst, v) => setVols((s) => ({ ...s, mixer: { ...(s.mixer || {}), [inst]: v } }))
  const dirty = INSTRUMENTS.some((inst) => mixVal(inst) !== 100)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={t('sound')} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <span className="sheet-title">{t('sound')}</span>
          <button type="button" className="sheet-close" onClick={onClose} aria-label={t('close')}>✕</button>
        </div>

        <span className="field-label">{t('soundKit')}</span>
        <div className="kit-chips">
          {KIT_NAMES.map((name) => (
            <button key={name} type="button"
              className={'kit-chip' + (kit === name ? ' is-active' : '')}
              onClick={() => pickKit(name)}>
              {t('kit_' + name)}
            </button>
          ))}
        </div>

        <div className="sheet-mixhead">
          <span className="field-label">{t('mixer')}</span>
          {dirty && (
            <Button size="sm" onClick={() => setVols((s) => ({ ...s, mixer: {} }))}>{t('mixerReset')}</Button>
          )}
        </div>
        <div className="mixer-rows">
          {INSTRUMENTS.map((inst) => (
            <div className="volume-row mixer-row" key={inst}>
              <span className={'mix-label' + (mixVal(inst) === 0 ? ' is-muted' : '')}>{t(inst)}</span>
              <Slider value={mixVal(inst)} min={0} max={200}
                onChange={(v) => setMix(inst, v)} aria-label={t(inst)} />
              <span className="v-val num">{mixVal(inst)}%</span>
            </div>
          ))}
        </div>
        <p className="muted-line sheet-hint"><Icon name="vol" className="v-ic" /> {t('mixerHint')}</p>
      </div>
    </div>
  )
}
