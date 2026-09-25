import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, Heart, Settings, Sun, Backpack, X, Volume2, VolumeX, Sparkles } from 'lucide-react'
import Calendar from './components/Calendar'
import Needs from './components/Needs'
import SchoolPrep from './components/SchoolPrep'
import { formatLongDate, formatTime, localDateKey, minutesSinceMidnight } from './lib/date'
import { overdueIds } from './lib/routine'
import { useAppStore } from './store'

type Page = 'prep' | 'calendar' | 'needs'
const PAGE_TITLES: Record<Page, string> = { prep: 'School Prep', calendar: 'Family Calendar', needs: 'Family Needs' }
const EMPTY_IDS: string[] = []

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [page, setPage] = useState<Page>('prep')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [flashActive, setFlashActive] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)
  const autoOpenedFor = useRef('')
  const dateKey = localDateKey(now)
  const minute = minutesSinceMidnight(now)
  const completedByDate = useAppStore((state) => state.completedByDate)
  const notifiedByDate = useAppStore((state) => state.notifiedByDate)
  const completed = completedByDate[dateKey] || EMPTY_IDS
  const notified = notifiedByDate[dateKey] || EMPTY_IDS
  const markNotified = useAppStore((state) => state.markNotified)
  const flashAlerts = useAppStore((state) => state.flashAlerts)
  const setFlashAlerts = useAppStore((state) => state.setFlashAlerts)
  const soundAlerts = useAppStore((state) => state.soundAlerts)
  const setSoundAlerts = useAppStore((state) => state.setSoundAlerts)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    const wake = () => setNow(new Date())
    document.addEventListener('visibilitychange', wake)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', wake) }
  }, [])

  useEffect(() => {
    if (minute >= 5 * 60 + 30 && minute < 9 * 60 && autoOpenedFor.current !== dateKey) {
      setPage('prep')
      autoOpenedFor.current = dateKey
    }
  }, [dateKey, minute])

  const unlockAudio = useCallback(() => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext()
      void audioRef.current.resume()
    } catch { /* Audio is optional on browsers that block it. */ }
  }, [])

  useEffect(() => {
    if (!soundAlerts) return
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [soundAlerts, unlockAudio])

  const playDing = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.state !== 'running') return
    const start = audio.currentTime
    for (const [frequency, delay] of [[659, 0], [784, 0.19]]) {
      const oscillator = audio.createOscillator()
      const volume = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      volume.gain.setValueAtTime(0.0001, start + delay)
      volume.gain.exponentialRampToValueAtTime(0.07, start + delay + 0.025)
      volume.gain.exponentialRampToValueAtTime(0.0001, start + delay + 0.48)
      oscillator.connect(volume).connect(audio.destination)
      oscillator.start(start + delay)
      oscillator.stop(start + delay + 0.5)
    }
  }, [])

  useEffect(() => {
    // Only alert during the active morning, and only once per task per day.
    if (minute < 7 * 60 || minute > 8 * 60 + 40) return
    const fresh = overdueIds(minute, completed).filter((id) => !notified.includes(id))
    if (!fresh.length) return
    markNotified(dateKey, fresh)
    if (flashAlerts && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFlashActive(true)
      window.setTimeout(() => setFlashActive(false), 4300)
    }
    if (soundAlerts) playDing()
  }, [minute, completed, notified, dateKey, markNotified, flashAlerts, soundAlerts, playDing])

  function choosePage(next: Page) {
    setPage(next)
    document.querySelector('.app-main')?.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand-mark" aria-hidden="true"><Sun /></div>
      <div className="header-title"><h1>{PAGE_TITLES[page]}</h1><p>{formatLongDate(now)}</p></div>
      <div className="header-right"><time dateTime={now.toISOString()}>{formatTime(now)}</time><button type="button" className="header-settings" onClick={() => setSettingsOpen(true)} aria-label="Open settings"><Settings /></button></div>
    </header>

    <main className="app-main" id="main-content">
      {page === 'prep' && <SchoolPrep now={now} onEnableSound={unlockAudio} />}
      {page === 'calendar' && <Calendar now={now} />}
      {page === 'needs' && <Needs />}
    </main>

    <nav className="bottom-nav" aria-label="Main sections">
      <button type="button" className={page === 'calendar' ? 'active' : ''} aria-current={page === 'calendar' ? 'page' : undefined} onClick={() => choosePage('calendar')}><CalendarDays /><span>Calendar</span></button>
      <button type="button" className={page === 'needs' ? 'active' : ''} aria-current={page === 'needs' ? 'page' : undefined} onClick={() => choosePage('needs')}><Heart /><span>Needs</span></button>
      <button type="button" className={page === 'prep' ? 'active' : ''} aria-current={page === 'prep' ? 'page' : undefined} onClick={() => choosePage('prep')}><Backpack /><span>School Prep</span></button>
    </nav>

    {flashActive && <div className="screen-flash" aria-hidden="true" />}

    {settingsOpen && <div className="dialog-backdrop" role="presentation"><section className="settings-dialog" role="dialog" aria-modal="true" aria-label="Planner settings">
      <div className="picker-header"><h2>Planner settings</h2><button className="icon-button" type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X /></button></div>
      <p>Morning reminders are shown for unfinished tasks as their deadlines pass.</p>
      <button type="button" className="settings-row" onClick={() => { if (!soundAlerts) unlockAudio(); setSoundAlerts(!soundAlerts) }} aria-pressed={soundAlerts}>{soundAlerts ? <Volume2 /> : <VolumeX />}<span><strong>Polite ding</strong><small>Plays when a task becomes overdue</small></span><em>{soundAlerts ? 'On' : 'Off'}</em></button>
      <button type="button" className="settings-row" onClick={() => setFlashAlerts(!flashAlerts)} aria-pressed={flashAlerts}><Sparkles /><span><strong>Screen flash</strong><small>A short, one-time alert for overdue tasks</small></span><em>{flashAlerts ? 'On' : 'Off'}</em></button>
      <p className="settings-footnote">Sound begins after a tap because iPad browsers require interaction before playing audio. The planner must stay open and awake for timely alerts.</p>
    </section></div>}
  </div>
}
