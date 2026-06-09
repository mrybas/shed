import { useI18n } from '../i18n/I18nContext.jsx'
import { INSTRUMENTS, stepsPerBeat } from '../model/exercise.js'

// Editable step grid. Rows = instruments (+ a sticking row). Columns = steps.
// Cell click cycles: off -> on -> on+accent -> off.
// Sticking cell cycles: '' -> R -> L -> ''.
export default function SequencerGrid({ exercise, currentStep, onToggleCell, onCycleSticking }) {
  const { t } = useI18n()
  const spb = stepsPerBeat(exercise.subdivision)
  const n = exercise.rows[INSTRUMENTS[0]].length

  const colStyle = { gridTemplateColumns: `var(--label-w) repeat(${n}, 1fr)` }

  return (
    <div className="sequencer">
      {/* Sticking row */}
      <div className="grid-row" style={colStyle}>
        <div className="row-label sticking-label">{t('sticking')}</div>
        {Array.from({ length: n }, (_, step) => {
          const val = exercise.sticking[step]
          const beatStart = step % spb === 0
          return (
            <button
              key={step}
              className={`sticking-cell ${val ? 'has-' + val : ''} ${beatStart ? 'beat-start' : ''} ${step === currentStep ? 'playhead' : ''}`}
              onClick={() => onCycleSticking(step)}
            >
              {val}
            </button>
          )
        })}
      </div>

      {/* Instrument rows */}
      {INSTRUMENTS.map((inst) => (
        <div className="grid-row" style={colStyle} key={inst}>
          <div className="row-label">{t(inst)}</div>
          {exercise.rows[inst].map((cell, step) => {
            const beatStart = step % spb === 0
            const cls = [
              'cell',
              cell.on ? 'on' : '',
              cell.accent ? 'accent' : '',
              beatStart ? 'beat-start' : '',
              step === currentStep ? 'playhead' : '',
            ].filter(Boolean).join(' ')
            return (
              <button
                key={step}
                className={cls}
                onClick={() => onToggleCell(inst, step)}
                title={t('cellHint')}
              />
            )
          })}
        </div>
      ))}

      {/* Beat numbers */}
      <div className="grid-row beat-numbers" style={colStyle}>
        <div className="row-label" />
        {Array.from({ length: n }, (_, step) => (
          <div key={step} className="beat-number">
            {step % spb === 0 ? step / spb + 1 : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
