import { beforeEach, describe, expect, it, vi } from 'vitest'
import { allRoutineTasks } from './lib/routine'

const saved = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => saved.get(key) ?? null,
  setItem: (key: string, value: string) => saved.set(key, value),
  removeItem: (key: string) => saved.delete(key),
})
const { useAppStore } = await import('./store')
const date = '2026-09-25'
const ids = allRoutineTasks.map((task) => task.id)

beforeEach(() => {
  saved.clear()
  useAppStore.setState({ completedByDate: {}, celebratedByDate: {} })
})

describe('routine celebrations', () => {
  it('celebrates the last real task, including clothes, exactly once per routine date', () => {
    const toggle = useAppStore.getState().toggleTask
    for (const id of ids.slice(1)) expect(toggle(date, id)).toBe(false)
    expect(toggle(date, ids[0])).toBe(true)
    expect(toggle(date, ids[0])).toBe(false)
    expect(toggle(date, ids[0])).toBe(false)
    expect(useAppStore.getState().completedByDate[date]).toHaveLength(ids.length)
    expect(useAppStore.getState().celebratedByDate[date]).toBe(true)
  })

  it('persists the celebration across reloads and allows the next day to celebrate', async () => {
    for (const id of ids) useAppStore.getState().toggleTask(date, id)
    // Replace in-memory state without overwriting the saved browser copy.
    const persisted = saved.get('family-wall-planner-v1')!
    useAppStore.setState({ completedByDate: {}, celebratedByDate: {} })
    saved.set('family-wall-planner-v1', persisted)
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().celebratedByDate[date]).toBe(true)
    expect(useAppStore.getState().toggleTask(date, ids[0])).toBe(false)
    expect(useAppStore.getState().toggleTask(date, ids[0])).toBe(false)
    const nextDate = '2026-09-26'
    for (const id of ids.slice(0, -1)) expect(useAppStore.getState().toggleTask(nextDate, id)).toBe(false)
    expect(useAppStore.getState().toggleTask(nextDate, ids.at(-1)!)).toBe(true)
  })

  it('does not count unknown saved IDs as completed tasks', () => {
    useAppStore.setState({ completedByDate: { [date]: ['old-task', ...ids.slice(2)] } })
    expect(useAppStore.getState().toggleTask(date, ids[1])).toBe(false)
    expect(useAppStore.getState().toggleTask(date, ids[0])).toBe(true)
  })

  it('loads older saves without celebration data and does not replay an already-finished routine', async () => {
    saved.set('family-wall-planner-v1', JSON.stringify({ state: { completedByDate: { [date]: ids } }, version: 0 }))
    await useAppStore.persist.rehydrate()
    expect(useAppStore.getState().celebratedByDate).toEqual({})
    expect(useAppStore.getState().toggleTask(date, ids[0])).toBe(false)
    expect(useAppStore.getState().toggleTask(date, ids[0])).toBe(false)
  })
})
