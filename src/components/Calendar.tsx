import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, CloudOff, Link2, RefreshCw, Settings2, X } from 'lucide-react'
import LargeTextEntry from './LargeTextEntry'
import { addDays, dateFromKey, formatDay, formatLongDate, formatShortMonth, localDateKey } from '../lib/date'
import {
  connectGoogle, disconnectGoogle, eventTimeLabel, eventsOnDay,
  fetchCalendarChoices, fetchCalendarEvents, isGoogleConnected, loadGoogleIdentity,
  type CalendarChoice, type CalendarEvent,
} from '../lib/google-calendar'
import { useAppStore } from '../store'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function EventCard({ event, index, day }: { event: CalendarEvent; index: number; day: Date }) {
  const beganEarlier = !event.start.date && new Date(event.start.dateTime || '').getTime() < new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  return <article className={`event-card event-color-${index % 4}`}>
    <div className="event-time">{beganEarlier ? 'Continues' : eventTimeLabel(event)}</div>
    <div className="event-dot" aria-hidden="true" />
    <div className="event-copy"><strong>{event.summary || 'Untitled event'}</strong>{event.location && <span>{event.location}</span>}</div>
  </article>
}

export default function Calendar({ now }: { now: Date }) {
  const todayKey = localDateKey(now)
  const [selectedKey, setSelectedKey] = useState(todayKey)
  const [followToday, setFollowToday] = useState(true)
  const [mode, setMode] = useState<'today' | 'week'>('today')
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(isGoogleConnected())
  const [connecting, setConnecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [choices, setChoices] = useState<CalendarChoice[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualId, setManualId] = useState('')
  const selectedCalendarId = useAppStore((state) => state.selectedCalendarId)
  const selectCalendar = useAppStore((state) => state.selectCalendar)
  const clearCalendar = useAppStore((state) => state.clearCalendar)
  const cache = useAppStore((state) => state.calendarCache)
  const saveCalendarEvents = useAppStore((state) => state.saveCalendarEvents)
  const selectedDate = useMemo(() => dateFromKey(selectedKey), [selectedKey])
  const through = localDateKey(addDays(selectedDate, 14))
  const cacheMatchesCalendar = Boolean(cache && cache.calendarId === selectedCalendarId)
  const visibleEvents = cacheMatchesCalendar && cache ? cache.events : []
  const isCachedDay = (day: Date) => {
    const key = localDateKey(day)
    return Boolean(cacheMatchesCalendar && cache && cache.from <= key && key < cache.through)
  }
  const calendarName = choices.find((choice) => choice.id === selectedCalendarId)?.summary || (selectedCalendarId ? 'Family calendar' : '')

  useEffect(() => {
    if (!CLIENT_ID) return
    let active = true
    loadGoogleIdentity().then(() => { if (active) setReady(true) }).catch((loadError: Error) => { if (active) setError(loadError.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setConnected(isGoogleConnected()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => { if (followToday) setSelectedKey(todayKey) }, [followToday, todayKey])

  const refresh = useCallback(async () => {
    if (!selectedCalendarId || !isGoogleConnected()) return
    setLoading(true)
    setError('')
    try {
      const events = await fetchCalendarEvents(selectedCalendarId, selectedDate, addDays(selectedDate, 14))
      saveCalendarEvents({ calendarId: selectedCalendarId, from: selectedKey, through, events, updatedAt: Date.now() })
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Could not load the calendar.')
      setConnected(isGoogleConnected())
    } finally { setLoading(false) }
  }, [selectedCalendarId, selectedDate, selectedKey, through, saveCalendarEvents])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const timer = window.setInterval(() => { void refresh() }, 5 * 60_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  function connect() {
    if (!CLIENT_ID || !ready) return
    setConnecting(true)
    setError('')
    // Keep the token request inside this click handler for iPad popup rules.
    connectGoogle(CLIENT_ID).then(async () => {
      setConnected(true)
      if (selectedCalendarId) await refresh()
      const available = await fetchCalendarChoices()
      setChoices(available)
      if (!selectedCalendarId) setPickerOpen(true)
    }).catch((connectError: Error) => setError(connectError.message)).finally(() => setConnecting(false))
  }

  function chooseCalendar(id: string) {
    selectCalendar(id)
    setPickerOpen(false)
    setManualOpen(false)
    setError('')
  }

  function move(days: number) { setFollowToday(false); setSelectedKey(localDateKey(addDays(selectedDate, days))) }

  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDate, index))
  const todayEvents = eventsOnDay(visibleEvents, selectedDate)
  const hasSource = Boolean(selectedCalendarId)
  const hasData = isCachedDay(selectedDate)

  return <div className="page-content calendar-page">
    <div className="calendar-topline">
      <div><span className="eyebrow">FAMILY SCHEDULE</span><h2>{mode === 'today' ? formatLongDate(selectedDate) : `${formatShortMonth(selectedDate)} ${selectedDate.getDate()} – ${formatShortMonth(days[6])} ${days[6].getDate()}`}</h2></div>
      <button type="button" className={`calendar-source ${connected && hasSource ? 'connected' : ''}`} onClick={() => connected ? setPickerOpen(true) : connect()} disabled={!CLIENT_ID || connecting || !ready}>
        {connected && hasSource ? <Check /> : <Link2 />}
        <span>{!CLIENT_ID ? 'Setup needed' : connecting ? 'Connecting…' : connected && hasSource ? calendarName : connected ? 'Choose calendar' : hasSource ? 'Reconnect' : 'Connect Google'}</span>
      </button>
    </div>

    <div className="calendar-toolbar">
      <div className="segmented" role="group" aria-label="Calendar view"><button type="button" className={mode === 'today' ? 'active' : ''} aria-pressed={mode === 'today'} onClick={() => setMode('today')}>Today</button><button type="button" className={mode === 'week' ? 'active' : ''} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>Week</button></div>
      <div className="date-controls"><button type="button" aria-label={mode === 'today' ? 'Previous day' : 'Previous week'} onClick={() => move(mode === 'today' ? -1 : -7)}><ChevronLeft /></button><button type="button" className="jump-today" onClick={() => { setSelectedKey(todayKey); setFollowToday(true) }}>Jump to today</button><button type="button" aria-label={mode === 'today' ? 'Next day' : 'Next week'} onClick={() => move(mode === 'today' ? 1 : 7)}><ChevronRight /></button></div>
    </div>

    {!CLIENT_ID && <div className="connection-card"><CalendarDays /><h3>Connect your family calendar</h3><p>This installation needs a Google OAuth client ID. Add <code>VITE_GOOGLE_CLIENT_ID</code> to the build configuration, then open this page again.</p></div>}
    {CLIENT_ID && !connected && <div className="connection-card"><CloudOff /><h3>{hasData ? 'Showing the last saved schedule' : 'Calendar needs a connection'}</h3><p>{hasSource ? 'Tap Reconnect to refresh family events. Google access is renewed by a tap when it expires.' : 'Tap Connect Google and choose the family calendar to show real events here.'}</p><button className="primary-button" type="button" onClick={connect} disabled={!ready || connecting}>{connecting ? 'Connecting…' : hasSource ? 'Reconnect' : 'Connect Google'}</button></div>}
    {error && <div className="inline-error" role="alert">{error}</div>}
    {hasSource && <div className="sync-row"><span>{loading ? 'Refreshing calendar…' : hasData && cache ? `Updated ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(cache.updatedAt))}${connected ? '' : ' · Offline copy'}` : 'No saved events for this date'}</span>{connected && <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw /> Refresh</button>}</div>}

    {mode === 'today' && <section className="today-agenda" aria-label="Events for the selected day">
      {todayEvents.length ? todayEvents.map((event, index) => <EventCard key={event.id} event={event} index={index} day={selectedDate} />) : <div className="calendar-empty"><CalendarDays /><strong>{hasData ? 'No events today' : 'Events will appear here'}</strong><span>{hasData ? 'Enjoy the open space.' : 'Connect Google to see this day.'}</span></div>}
    </section>}

    {mode === 'week' && <section className="week-list" aria-label="Events for the next seven days">
      {days.map((day) => {
        const dayEvents = eventsOnDay(visibleEvents, day)
        return <div className={`week-day ${localDateKey(day) === todayKey ? 'is-today' : ''}`} key={localDateKey(day)}>
          <div className="week-date"><span>{formatDay(day)}</span><strong>{day.getDate()}</strong><small>{formatShortMonth(day)}</small>{localDateKey(day) === todayKey && <em>Today</em>}</div>
          <div className="week-events">{dayEvents.length ? dayEvents.map((event, index) => <div className={`week-event event-color-${index % 4}`} key={event.id}><span>{eventTimeLabel(event)}</span><strong>{event.summary || 'Untitled event'}</strong></div>) : <span className="week-empty">{isCachedDay(day) ? 'No plans yet' : hasSource ? 'No events loaded' : 'Connect Google to see events'}</span>}</div>
        </div>
      })}
    </section>}

    {pickerOpen && <div className="dialog-backdrop" role="presentation"><section className="picker-dialog" role="dialog" aria-modal="true" aria-label="Choose family calendar">
      <div className="picker-header"><h2>Choose family calendar</h2><button className="icon-button" type="button" onClick={() => setPickerOpen(false)} aria-label="Close"><X /></button></div>
      <p>Select the Google calendar your family uses.</p>
      <div className="calendar-choices">{choices.map((choice) => <button type="button" key={choice.id} className={selectedCalendarId === choice.id ? 'selected' : ''} onClick={() => chooseCalendar(choice.id)}><span className="choice-dot" style={{ background: choice.backgroundColor || '#178c83' }} /><strong>{choice.summary}</strong>{selectedCalendarId === choice.id && <Check />}</button>)}</div>
      {!choices.length && <p>Connect Google to list your calendars, or enter a calendar ID.</p>}
      <button className="manual-calendar" type="button" onClick={() => { setManualId(selectedCalendarId); setManualOpen(true) }}><Settings2 /> Enter calendar ID with the large keyboard</button>
      {selectedCalendarId && <button className="text-danger" type="button" onClick={() => { disconnectGoogle(); clearCalendar(); setConnected(false); setChoices([]); setPickerOpen(false) }}>Disconnect and clear saved events</button>}
    </section></div>}
    {manualOpen && <LargeTextEntry title="Calendar ID" value={manualId} onChange={setManualId} placeholder="name@example.com" submitLabel="Use" onSubmit={() => { if (manualId.trim()) chooseCalendar(manualId.trim()) }} onClose={() => setManualOpen(false)} />}
  </div>
}
