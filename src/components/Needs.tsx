import { useRef, useState } from 'react'
import { Check, ChevronRight, Home, Mic, Plus, ShoppingCart } from 'lucide-react'
import LargeTextEntry from './LargeTextEntry'
import { FAMILY_MEMBERS, useAppStore, type FamilyMember, type FamilyNeed, type NeedCategory } from '../store'

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  onresult: ((event: SpeechResult) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  const speechWindow = window as Window & { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
}

function NeedRow({ need, onToggle, onEdit }: { need: FamilyNeed; onToggle: () => void; onEdit: () => void }) {
  return <div className={`need-row ${need.completedAt ? 'completed' : ''}`}>
    <button type="button" className={`need-check ${need.completedAt ? 'checked' : ''}`} aria-label={`${need.completedAt ? 'Mark incomplete' : 'Complete'} ${need.text}`} onClick={onToggle}>{need.completedAt && <Check />}</button>
    <button type="button" className="need-main" onClick={onEdit}>
      <strong>{need.text}</strong><span>Requested by {need.requestedBy}</span>
    </button>
    <button type="button" className="need-edit" onClick={onEdit} aria-label={`Edit ${need.text}`}><ChevronRight /></button>
  </div>
}

export default function Needs() {
  const needs = useAppStore((state) => state.needs)
  const addNeed = useAppStore((state) => state.addNeed)
  const updateNeed = useAppStore((state) => state.updateNeed)
  const toggleNeed = useAppStore((state) => state.toggleNeed)
  const deleteNeed = useAppStore((state) => state.deleteNeed)
  const [requester, setRequester] = useState<FamilyMember>('James')
  const [category, setCategory] = useState<NeedCategory>('groceries')
  const [editor, setEditor] = useState<'add' | 'edit' | null>(null)
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  function openAdd() {
    setEditingId('')
    setDraft('')
    setVoiceError('')
    setEditor('add')
  }

  function openEdit(need: FamilyNeed) {
    setEditingId(need.id)
    setDraft(need.text)
    setCategory(need.category)
    setRequester(need.requestedBy)
    setVoiceError('')
    setEditor('edit')
  }

  function closeEditor() {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setListening(false)
    setEditor(null)
  }

  function startVoice() {
    const Recognition = getSpeechRecognition()
    if (!Recognition) {
      setVoiceError('Voice input is unavailable in this browser. Use the large keyboard below.')
      return
    }
    recognitionRef.current?.stop()
    const recognition = new Recognition()
    recognitionRef.current = recognition
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() || ''
      if (transcript) setDraft((current) => current ? `${current.trim()} ${transcript}` : transcript)
      setVoiceError('')
    }
    recognition.onerror = (event) => {
      setVoiceError(event.error === 'not-allowed' ? 'Microphone access was blocked. Allow it in Safari settings.' : `Voice input stopped: ${event.error}.`)
      setListening(false)
    }
    recognition.onend = () => setListening(false)
    try { recognition.start(); setListening(true) }
    catch { setVoiceError('Voice input could not start. Try again or use the keyboard.'); setListening(false) }
  }

  function save() {
    if (!draft.trim()) return
    if (editor === 'edit') updateNeed(editingId, draft, category, requester)
    else addNeed(draft, category, requester)
    closeEditor()
  }

  function section(sectionCategory: NeedCategory, title: string) {
    const items = needs.filter((need) => need.category === sectionCategory).sort((a, b) => Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt)) || b.createdAt - a.createdAt)
    const Icon = sectionCategory === 'groceries' ? ShoppingCart : Home
    return <section className={`needs-section ${sectionCategory}`} key={sectionCategory}>
      <div className="needs-heading"><span className="needs-heading-icon"><Icon /></span><h3>{title}</h3><span className="needs-count">{items.filter((need) => !need.completedAt).length} open</span></div>
      {items.length ? items.map((need) => <NeedRow key={need.id} need={need} onToggle={() => toggleNeed(need.id)} onEdit={() => openEdit(need)} />) : <p className="needs-empty">Nothing here yet. Tap Add a need.</p>}
    </section>
  }

  return <div className="page-content needs-page">
    <div className="intro-row"><div><span className="eyebrow">SHARED FAMILY LIST</span><h2>What do we need?</h2></div></div>
    <div className="add-need-bar">
      <button className="add-need-button" type="button" onClick={openAdd}><Plus /><span>Add a need</span></button>
      <button className="add-voice-button" type="button" aria-label="Dictate a need" onClick={() => { openAdd(); startVoice() }}><Mic /><span>Speak</span></button>
    </div>
    <div className="requester-label">Who’s asking?</div>
    <div className="requester-chips" role="group" aria-label="Choose requester">
      {FAMILY_MEMBERS.map((member) => <button type="button" key={member} className={`requester-chip ${member === requester ? 'selected' : ''}`} aria-pressed={member === requester} onClick={() => setRequester(member)}><span>{member[0]}</span>{member}</button>)}
    </div>
    {section('groceries', 'Groceries')}
    {section('house', 'Around the house')}
    {editor && <LargeTextEntry
      title={editor === 'edit' ? 'Edit need' : 'Add a need'} value={draft} onChange={setDraft} placeholder="What’s needed?" submitLabel={editor === 'edit' ? 'Save' : 'Add'} onSubmit={save} onClose={closeEditor}
      onDelete={editor === 'edit' ? () => { deleteNeed(editingId); closeEditor() } : undefined}
      onVoice={startVoice} listening={listening} voiceError={voiceError}
    >
      <div className="dialog-options"><span className="option-label">For</span><div className="choice-row"><button type="button" className={category === 'groceries' ? 'selected' : ''} onClick={() => setCategory('groceries')}><ShoppingCart /> Groceries</button><button type="button" className={category === 'house' ? 'selected' : ''} onClick={() => setCategory('house')}><Home /> House</button></div></div>
      <div className="dialog-options"><span className="option-label">Requested by</span><div className="choice-row requester-choice">{FAMILY_MEMBERS.map((member) => <button type="button" key={member} className={member === requester ? 'selected' : ''} onClick={() => setRequester(member)}>{member}</button>)}</div></div>
    </LargeTextEntry>}
  </div>
}
