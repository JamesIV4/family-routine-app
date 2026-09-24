import { Backpack, Bed, BriefcaseBusiness, CarFront, Check, Clock3, Coffee, Droplets, HeartPulse, Shirt, Smile, Sparkles, Sun, Volume2, VolumeX, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import { formatLongDate, formatTime, localDateKey, minutesSinceMidnight } from '../lib/date'
import { allRoutineTasks, clothesTask, routineTasks, routineViewDate, type RoutineTask } from '../lib/routine'
import { useAppStore } from '../store'

const ICONS: Record<RoutineTask['icon'], LucideIcon> = {
  sun: Sun,
  shower: Droplets,
  bed: Bed,
  breakfast: Coffee,
  shirt: Shirt,
  hair: Sparkles,
  teeth: Smile,
  face: Waves,
  medication: HeartPulse,
  bag: Backpack,
  car: CarFront,
}

function TaskCard({ task, done, late, alerting, onToggle, compact = false }: {
  task: RoutineTask; done: boolean; late: boolean; alerting: boolean; onToggle: () => void; compact?: boolean
}) {
  const Icon = ICONS[task.icon]
  return (
    <button type="button" className={`task-card ${done ? 'done' : ''} ${late ? 'overdue' : ''} ${alerting ? 'alerting' : ''} ${compact ? 'compact' : ''}`} onClick={onToggle} aria-pressed={done}>
      {!compact && <span className="task-time">{task.time}</span>}
      <span className="task-icon" aria-hidden="true"><Icon /></span>
      <span className="task-copy"><strong>{task.title}</strong>{task.detail && <small>{task.detail}</small>}</span>
      {late && <span className="late-label">Past due</span>}
      <span className={`big-check ${done ? 'checked' : ''}`} aria-hidden="true">{done && <Check />}</span>
    </button>
  )
}

export default function SchoolPrep({ now, onEnableSound }: { now: Date; onEnableSound: () => void }) {
  const minute = minutesSinceMidnight(now)
  const preparingTomorrow = minute >= 17 * 60
  const routineDate = routineViewDate(now)
  const dateKey = localDateKey(routineDate)
  const completedByDate = useAppStore((state) => state.completedByDate)
  const completed = completedByDate[dateKey] || []
  const toggleTask = useAppStore((state) => state.toggleTask)
  const flashAlerts = useAppStore((state) => state.flashAlerts)
  const setFlashAlerts = useAppStore((state) => state.setFlashAlerts)
  const soundAlerts = useAppStore((state) => state.soundAlerts)
  const setSoundAlerts = useAppStore((state) => state.setSoundAlerts)
  const doneCount = completed.filter((id) => allRoutineTasks.some((task) => task.id === id)).length
  const markerIndex = useMemo(() => routineTasks.filter((task) => task.deadlineMinutes < minute).length, [minute])

  function currentMarker() {
    return <div className="now-marker" key="now-marker" aria-label={`Current time ${formatTime(now)}`}><span>NOW · {formatTime(now)}</span></div>
  }

  return (
    <div className="page-content prep-page">
      <div className="intro-row">
        <div><span className="eyebrow">{preparingTomorrow ? 'TOMORROW’S ROUTINE' : 'TODAY’S ROUTINE'} · {formatLongDate(routineDate).toUpperCase()}</span><h2>{preparingTomorrow ? 'Ready for tomorrow.' : 'Let’s get ready.'}</h2></div>
        <div className="progress-bubble"><strong>{doneCount}/{allRoutineTasks.length}</strong><span>done</span></div>
      </div>
      <div className="progress-track" aria-label={`${doneCount} of ${allRoutineTasks.length} tasks done`}><span style={{ width: `${doneCount / allRoutineTasks.length * 100}%` }} /></div>
      <div className="alert-controls">
        <button type="button" className={`soft-toggle ${soundAlerts ? 'selected' : ''}`} onClick={() => { if (!soundAlerts) onEnableSound(); setSoundAlerts(!soundAlerts) }} aria-pressed={soundAlerts}>
          {soundAlerts ? <Volume2 /> : <VolumeX />} Sound {soundAlerts ? 'on' : 'off'}
        </button>
        <button type="button" className={`soft-toggle ${flashAlerts ? 'selected' : ''}`} onClick={() => setFlashAlerts(!flashAlerts)} aria-pressed={flashAlerts}>
          <Sparkles /> Flash alerts {flashAlerts ? 'on' : 'off'}
        </button>
      </div>

      <section className="before-card" aria-label="Clothes preparation">
        <div className="section-heading"><BriefcaseBusiness aria-hidden="true" /><span>Before the rush</span></div>
        <TaskCard task={clothesTask} compact done={completed.includes(clothesTask.id)} late={!preparingTomorrow && minute > clothesTask.deadlineMinutes && !completed.includes(clothesTask.id)} alerting={minute <= 8 * 60 + 40} onToggle={() => toggleTask(dateKey, clothesTask.id)} />
        <div className="deadline-note"><Clock3 aria-hidden="true" /> Night before is best. Latest: 7:45 AM.</div>
      </section>

      <section className="timeline-section" aria-label="Morning task timeline">
        <div className="section-heading"><Sun aria-hidden="true" /><span>This morning</span></div>
        <div className="timeline-list">
          {routineTasks.flatMap((task, index) => [
            ...(!preparingTomorrow && index === markerIndex ? [currentMarker()] : []),
            <TaskCard key={task.id} task={task} done={completed.includes(task.id)} late={!preparingTomorrow && minute > task.deadlineMinutes && !completed.includes(task.id)} alerting={minute <= 8 * 60 + 40} onToggle={() => toggleTask(dateKey, task.id)} />,
          ])}
          {!preparingTomorrow && markerIndex === routineTasks.length && currentMarker()}
        </div>
      </section>
      <div className="gentle-reminder"><HeartPulse aria-hidden="true" /><span>Stay off phones and computers. Leave toys for later. Keep voices calm and kind.</span></div>
    </div>
  )
}
