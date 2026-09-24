import { addDays, minutesSinceMidnight } from './date'

export type RoutineTask = {
  id: string
  time: string
  deadlineMinutes: number
  title: string
  detail?: string
  icon: 'sun' | 'shower' | 'bed' | 'breakfast' | 'shirt' | 'hair' | 'teeth' | 'face' | 'medication' | 'bag' | 'car'
}

export const clothesTask: RoutineTask = {
  id: 'clothes',
  time: 'Night before · 7:45 AM latest',
  deadlineMinutes: 7 * 60 + 45,
  title: 'Lay out the kids’ clothes',
  detail: 'Shirts, underwear, pants, socks, and shoes',
  icon: 'shirt',
}

export const routineTasks: RoutineTask[] = [
  { id: 'wake', time: '7:00 AM', deadlineMinutes: 420, title: 'Wake up', icon: 'sun' },
  { id: 'shower', time: '7:30 AM', deadlineMinutes: 450, title: 'Finish shower and be ready', icon: 'shower' },
  { id: 'kids', time: '7:30 AM', deadlineMinutes: 450, title: 'Wake the kids', icon: 'bed' },
  { id: 'breakfast', time: '7:45 AM', deadlineMinutes: 465, title: 'Kids are eating breakfast', icon: 'breakfast' },
  { id: 'dressed', time: '8:05 AM', deadlineMinutes: 485, title: 'Kids are fully dressed', detail: 'Shirt, underwear, pants, socks, and shoes', icon: 'shirt' },
  { id: 'hair', time: '8:15 AM', deadlineMinutes: 495, title: 'Brush the kids’ hair', icon: 'hair' },
  { id: 'teeth', time: '8:15 AM', deadlineMinutes: 495, title: 'Brush the kids’ teeth', icon: 'teeth' },
  { id: 'faces', time: '8:15 AM', deadlineMinutes: 495, title: 'Clean the kids’ faces', icon: 'face' },
  { id: 'medication', time: '8:15 AM', deadlineMinutes: 495, title: 'Give Jameson his medication', icon: 'medication' },
  { id: 'backpacks', time: '8:20 AM', deadlineMinutes: 500, title: 'Everyone has a backpack', icon: 'bag' },
  { id: 'car', time: '8:20 AM', deadlineMinutes: 500, title: 'Get everyone into the car', icon: 'car' },
]

export const allRoutineTasks = [clothesTask, ...routineTasks]

export function routineViewDate(now: Date): Date {
  return minutesSinceMidnight(now) >= 17 * 60 ? addDays(now, 1) : now
}

export function overdueIds(nowMinutes: number, completedIds: string[]): string[] {
  return allRoutineTasks
    .filter((task) => nowMinutes > task.deadlineMinutes && !completedIds.includes(task.id))
    .map((task) => task.id)
}
