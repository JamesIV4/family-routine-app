export type CalendarChoice = {
  id: string
  summary: string
  primary?: boolean
  selected?: boolean
  backgroundColor?: string
}

export type CalendarEvent = {
  id: string
  summary?: string
  location?: string
  status?: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
}

type TokenResponse = { access_token?: string; expires_in?: number; error?: string }
type TokenClient = { requestAccessToken: (options?: { prompt?: string }) => void }
type GoogleAccounts = {
  oauth2: {
    initTokenClient: (options: {
      client_id: string
      scope: string
      callback: (response: TokenResponse) => void
      error_callback?: (error: { type: string }) => void
    }) => TokenClient
    revoke: (token: string, done: () => void) => void
  }
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts }
  }
}

let scriptPromise: Promise<void> | null = null
let token = ''
let tokenExpiresAt = 0

export function isGoogleConnected(): boolean {
  return Boolean(token && Date.now() < tokenExpiresAt)
}

export function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      if (window.google?.accounts.oauth2) resolve()
      else {
        scriptPromise = null
        reject(new Error('Google sign-in did not initialize. Try reloading the page.'))
      }
    }
    script.onerror = () => {
      scriptPromise = null
      script.remove()
      reject(new Error('Google sign-in could not load. Check the internet connection.'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function connectGoogle(clientId: string): Promise<void> {
  if (!window.google?.accounts.oauth2) {
    return Promise.reject(new Error('Google sign-in is still loading. Please try again.'))
  }
  return new Promise<void>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || 'Google did not return access.'))
          return
        }
        token = response.access_token
        tokenExpiresAt = Date.now() + (response.expires_in ?? 3600) * 1000 - 60_000
        resolve()
      },
      error_callback: (error) => reject(new Error(`Google sign-in was interrupted (${error.type}).`)),
    })
    client.requestAccessToken({ prompt: token ? '' : 'select_account' })
  })
}

export function disconnectGoogle(): void {
  if (token && window.google?.accounts.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => undefined)
  }
  token = ''
  tokenExpiresAt = 0
}

async function googleGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  if (!isGoogleConnected()) throw new Error('Google Calendar access expired. Tap Reconnect.')
  const query = params?.toString()
  const response = await fetch(`https://www.googleapis.com/calendar/v3/${path}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    if (response.status === 401) {
      token = ''
      tokenExpiresAt = 0
      throw new Error('Google Calendar access expired. Tap Reconnect.')
    }
    let message = `Google Calendar returned ${response.status}.`
    try {
      const body = await response.json() as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch { /* Keep the HTTP status message. */ }
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export async function fetchCalendarChoices(): Promise<CalendarChoice[]> {
  const calendars: CalendarChoice[] = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({ maxResults: '250' })
    if (pageToken) params.set('pageToken', pageToken)
    const page = await googleGet<{ items?: CalendarChoice[]; nextPageToken?: string }>('users/me/calendarList', params)
    calendars.push(...(page.items || []))
    pageToken = page.nextPageToken || ''
  } while (pageToken)
  return calendars.sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)) || a.summary.localeCompare(b.summary))
}

export async function fetchCalendarEvents(calendarId: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
      showDeleted: 'false',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const page = await googleGet<{ items?: CalendarEvent[]; nextPageToken?: string }>(
      `calendars/${encodeURIComponent(calendarId)}/events`, params,
    )
    events.push(...(page.items || []).filter((event) => event.status !== 'cancelled'))
    pageToken = page.nextPageToken || ''
  } while (pageToken)
  return events
}

function eventBounds(event: CalendarEvent): { start: Date; end: Date } {
  const start = event.start.date ? new Date(`${event.start.date}T00:00:00`) : new Date(event.start.dateTime || '')
  const end = event.end.date ? new Date(`${event.end.date}T00:00:00`) : new Date(event.end.dateTime || '')
  return { start, end }
}

export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  return events.filter((event) => {
    const bounds = eventBounds(event)
    return bounds.start < end && bounds.end > start
  }).sort((a, b) => {
    if (Boolean(a.start.date) !== Boolean(b.start.date)) return a.start.date ? -1 : 1
    return eventBounds(a).start.getTime() - eventBounds(b).start.getTime()
  })
}

export function eventTimeLabel(event: CalendarEvent): string {
  if (event.start.date) return 'All day'
  const start = new Date(event.start.dateTime || '')
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(start)
}
