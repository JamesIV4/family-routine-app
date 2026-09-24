import { describe, expect, it } from 'vitest'
import { eventsOnDay, type CalendarEvent } from './google-calendar'

describe('calendar day display', () => {
  it('shows a multiday all-day event on each included day, excluding its end date', () => {
    const event: CalendarEvent = {
      id: 'trip', summary: 'Trip', start: { date: '2026-09-24' }, end: { date: '2026-09-26' },
    }
    expect(eventsOnDay([event], new Date(2026, 8, 24))).toHaveLength(1)
    expect(eventsOnDay([event], new Date(2026, 8, 25))).toHaveLength(1)
    expect(eventsOnDay([event], new Date(2026, 8, 26))).toHaveLength(0)
  })

  it('shows an overnight event on both days and puts all-day events first', () => {
    const overnight: CalendarEvent = {
      id: 'overnight', summary: 'Overnight',
      start: { dateTime: '2026-09-24T23:30:00' }, end: { dateTime: '2026-09-25T01:00:00' },
    }
    const allDay: CalendarEvent = {
      id: 'holiday', summary: 'Holiday', start: { date: '2026-09-25' }, end: { date: '2026-09-26' },
    }
    expect(eventsOnDay([overnight, allDay], new Date(2026, 8, 25)).map((event) => event.id)).toEqual(['holiday', 'overnight'])
  })
})
