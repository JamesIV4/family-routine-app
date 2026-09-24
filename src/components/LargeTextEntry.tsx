import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowBigUp, ArrowLeft, Check, Delete, Mic, X } from 'lucide-react'

type Props = {
  title: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  submitLabel: string
  onSubmit: () => void
  onClose: () => void
  onDelete?: () => void
  onVoice?: () => void
  listening?: boolean
  voiceError?: string
  children?: ReactNode
}

const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const NUMBER_ROWS = ['1234567890', '@#$%&*()-_', "'\"/:;!?.,+"]

export default function LargeTextEntry({
  title, value, onChange, placeholder, submitLabel, onSubmit, onClose,
  onDelete, onVoice, listening, voiceError, children,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [shifted, setShifted] = useState(true)
  const [numbers, setNumbers] = useState(false)

  useEffect(() => {
    document.body.classList.add('dialog-open')
    return () => document.body.classList.remove('dialog-open')
  }, [])

  function edit(key: string) {
    const input = inputRef.current
    const start = input?.selectionStart ?? value.length
    const end = input?.selectionEnd ?? value.length
    let next = value
    let cursor = start
    if (key === 'backspace') {
      const from = start === end ? Math.max(0, start - 1) : start
      next = value.slice(0, from) + value.slice(end)
      cursor = from
    } else {
      const inserted = shifted && !numbers ? key.toUpperCase() : key.toLowerCase()
      next = value.slice(0, start) + inserted + value.slice(end)
      cursor = start + inserted.length
      if (shifted && !numbers) setShifted(false)
    }
    onChange(next)
    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true })
      input?.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="text-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-top">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X /></button>
          <h2>{title}</h2>
          <button className="primary-button dialog-save" type="button" onClick={onSubmit} disabled={!value.trim()}>
            <Check aria-hidden="true" />{submitLabel}
          </button>
        </div>
        <div className="dialog-body">
          <div className="entry-line">
            <input
              ref={inputRef}
              aria-label={title}
              value={value}
              placeholder={placeholder}
              readOnly
              onKeyDown={(event) => {
                if (event.key === 'Backspace') { event.preventDefault(); edit('backspace') }
                else if (event.key === 'Enter') { event.preventDefault(); if (value.trim()) onSubmit() }
                else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) { event.preventDefault(); edit(event.key) }
              }}
            />
            {onVoice && <button className={`voice-button ${listening ? 'listening' : ''}`} type="button" onClick={onVoice} aria-label={listening ? 'Listening' : 'Dictate text'}>
              <Mic aria-hidden="true" />
            </button>}
          </div>
          {voiceError && <p className="entry-message" role="status">{voiceError}</p>}
          {children}
          {onDelete && <button className="text-danger" type="button" onClick={onDelete}>Delete this need</button>}
        </div>
        <div className="large-keyboard" aria-label="Large on-screen keyboard">
          {(numbers ? NUMBER_ROWS : LETTER_ROWS).map((row, rowIndex) => (
            <div className="keyboard-row" key={rowIndex}>
              {rowIndex === 2 && !numbers && <button className={`keyboard-key function ${shifted ? 'active' : ''}`} type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => setShifted(!shifted)} aria-label="Shift"><ArrowBigUp /></button>}
              {Array.from(row).map((letter, index) => (
                <button className="keyboard-key" type="button" key={`${rowIndex}-${index}`} onPointerDown={(event) => event.preventDefault()} onClick={() => edit(letter)}>{shifted && !numbers ? letter : letter.toLowerCase()}</button>
              ))}
              {rowIndex === 2 && <button className="keyboard-key function" type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => edit('backspace')} aria-label="Backspace"><Delete /></button>}
            </div>
          ))}
          <div className="keyboard-row keyboard-bottom">
            <button className="keyboard-key function" type="button" onClick={() => setNumbers(!numbers)}>{numbers ? 'ABC' : '123'}</button>
            <button className="keyboard-key space-key" type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => edit(' ')}>space</button>
            <button className="keyboard-key done-key" type="button" onClick={() => value.trim() ? onSubmit() : onClose()}><ArrowLeft aria-hidden="true" /> Done</button>
          </div>
        </div>
      </section>
    </div>
  )
}
