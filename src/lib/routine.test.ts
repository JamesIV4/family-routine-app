import { describe, expect, it } from 'vitest'
import { localDateKey } from './date'
import { overdueIds, routineViewDate } from './routine'

describe('school prep schedule', () => {
  it('waits until the deadline has passed before marking a task late', () => {
    expect(overdueIds(7 * 60 + 45, [])).not.toContain('breakfast')
    expect(overdueIds(7 * 60 + 46, [])).toEqual(expect.arrayContaining(['clothes', 'breakfast']))
  })

  it('keeps simultaneous tasks separate and removes completed tasks', () => {
    const late = overdueIds(8 * 60 + 16, ['hair', 'medication'])
    expect(late).toContain('teeth')
    expect(late).toContain('faces')
    expect(late).not.toContain('hair')
    expect(late).not.toContain('medication')
    expect(late).not.toContain('backpacks')
  })

  it('stores evening clothes prep under tomorrow morning', () => {
    expect(localDateKey(routineViewDate(new Date(2026, 8, 24, 16, 59)))).toBe('2026-09-24')
    expect(localDateKey(routineViewDate(new Date(2026, 8, 24, 17, 0)))).toBe('2026-09-25')
  })
})
