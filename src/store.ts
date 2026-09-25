import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { CalendarEvent } from './lib/google-calendar'
import { allRoutineTasks } from './lib/routine'

export const FAMILY_MEMBERS = ['James', 'Elizabeth', 'Jameson', 'Addison', 'Ellie'] as const
export type FamilyMember = typeof FAMILY_MEMBERS[number]
export type NeedCategory = 'groceries' | 'house'

export type FamilyNeed = {
  id: string
  text: string
  category: NeedCategory
  requestedBy: FamilyMember
  createdAt: number
  completedAt: number | null
}

type CalendarCache = {
  calendarId: string
  from: string
  through: string
  events: CalendarEvent[]
  updatedAt: number
} | null

type AppStore = {
  needs: FamilyNeed[]
  completedByDate: Record<string, string[]>
  notifiedByDate: Record<string, string[]>
  celebratedByDate: Record<string, boolean>
  flashAlerts: boolean
  soundAlerts: boolean
  selectedCalendarId: string
  calendarCache: CalendarCache
  addNeed: (text: string, category: NeedCategory, requestedBy: FamilyMember) => string
  updateNeed: (id: string, text: string, category: NeedCategory, requestedBy: FamilyMember) => void
  toggleNeed: (id: string) => void
  deleteNeed: (id: string) => void
  // Returns true only for the first completed routine on this date.
  toggleTask: (dateKey: string, taskId: string) => boolean
  markNotified: (dateKey: string, taskIds: string[]) => void
  setFlashAlerts: (enabled: boolean) => void
  setSoundAlerts: (enabled: boolean) => void
  selectCalendar: (calendarId: string) => void
  saveCalendarEvents: (cache: NonNullable<CalendarCache>) => void
  clearCalendar: () => void
}

export const useAppStore = create<AppStore>()(persist((set) => ({
  needs: [],
  completedByDate: {},
  notifiedByDate: {},
  celebratedByDate: {},
  flashAlerts: true,
  soundAlerts: false,
  selectedCalendarId: '',
  calendarCache: null,
  addNeed: (text, category, requestedBy) => {
    const id = crypto.randomUUID()
    set((state) => ({
      needs: [{ id, text: text.trim(), category, requestedBy, createdAt: Date.now(), completedAt: null }, ...state.needs],
    }))
    return id
  },
  updateNeed: (id, text, category, requestedBy) => set((state) => ({
    needs: state.needs.map((need) => need.id === id ? { ...need, text: text.trim(), category, requestedBy } : need),
  })),
  toggleNeed: (id) => set((state) => ({
    needs: state.needs.map((need) => need.id === id ? { ...need, completedAt: need.completedAt ? null : Date.now() } : need),
  })),
  deleteNeed: (id) => set((state) => ({ needs: state.needs.filter((need) => need.id !== id) })),
  toggleTask: (dateKey, taskId) => {
    let celebrate = false
    set((state) => {
      const completed = state.completedByDate[dateKey] || []
      const next = completed.includes(taskId) ? completed.filter((id) => id !== taskId) : [...completed, taskId]
      const wasComplete = allRoutineTasks.every((task) => completed.includes(task.id))
      const isComplete = allRoutineTasks.every((task) => next.includes(task.id))
      celebrate = !wasComplete && isComplete && !state.celebratedByDate[dateKey]
      return {
        completedByDate: { ...state.completedByDate, [dateKey]: next },
        // Also remember already-completed legacy routines when undoing a check.
        celebratedByDate: wasComplete || isComplete
          ? { ...state.celebratedByDate, [dateKey]: true }
          : state.celebratedByDate,
      }
    })
    return celebrate
  },
  markNotified: (dateKey, taskIds) => set((state) => ({
    notifiedByDate: {
      ...state.notifiedByDate,
      [dateKey]: [...new Set([...(state.notifiedByDate[dateKey] || []), ...taskIds])],
    },
  })),
  setFlashAlerts: (flashAlerts) => set({ flashAlerts }),
  setSoundAlerts: (soundAlerts) => set({ soundAlerts }),
  selectCalendar: (selectedCalendarId) => set({ selectedCalendarId, calendarCache: null }),
  saveCalendarEvents: (calendarCache) => set({ calendarCache }),
  clearCalendar: () => set({ selectedCalendarId: '', calendarCache: null }),
}), {
  name: 'family-wall-planner-v1',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    needs: state.needs,
    completedByDate: state.completedByDate,
    notifiedByDate: state.notifiedByDate,
    celebratedByDate: state.celebratedByDate,
    flashAlerts: state.flashAlerts,
    soundAlerts: state.soundAlerts,
    selectedCalendarId: state.selectedCalendarId,
    calendarCache: state.calendarCache,
  }),
}))
