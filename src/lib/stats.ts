/** 统计与打卡周期计算 */
import { addDays, diffDays, eachDay, endOfMonth, endOfWeek, parseISO, startOfMonth, startOfWeek, today } from './date'
import type { Checkin, Habit, Journal, Task } from './types'

export interface PeriodRange {
  start: string
  end: string
  /** 该周期内应完成的次数 */
  target: number
  label: string
}

/** 计算某个打卡任务「当前周期」的时间范围与目标次数 */
export function currentPeriod(habit: Habit, ref = today()): PeriodRange {
  switch (habit.cycle_type) {
    case 'daily':
      return { start: ref, end: ref, target: Math.max(1, habit.cycle_target), label: '今日' }
    case 'weekdays': {
      const start = startOfWeek(ref)
      const end = endOfWeek(ref)
      const days = eachDay(start, ref).filter((d) => habit.weekdays.includes(parseISO(d).getDay()))
      return {
        start,
        end,
        target: Math.max(1, Math.min(habit.cycle_target, days.length) || days.length || 1),
        label: '本周',
      }
    }
    case 'weekly':
      return {
        start: startOfWeek(ref),
        end: endOfWeek(ref),
        target: Math.max(1, habit.cycle_target),
        label: '本周',
      }
    case 'monthly':
      return {
        start: startOfMonth(ref),
        end: endOfMonth(ref),
        target: Math.max(1, habit.cycle_target),
        label: '本月',
      }
    case 'interval': {
      const step = Math.max(1, habit.interval_days)
      const elapsed = Math.max(0, diffDays(habit.start_date, ref))
      const cycles = Math.floor(elapsed / step)
      const start = addDays(habit.start_date, cycles * step)
      return { start, end: addDays(start, step - 1), target: Math.max(1, habit.cycle_target), label: `第 ${cycles + 1} 个周期` }
    }
    default:
      return { start: ref, end: ref, target: 1, label: '今日' }
  }
}

/** 某天是否「应该」打卡 */
export function isScheduledDay(habit: Habit, date: string): boolean {
  if (date < habit.start_date) return false
  if (habit.end_date && date > habit.end_date) return false
  if (habit.cycle_type === 'weekdays') return habit.weekdays.includes(parseISO(date).getDay())
  if (habit.cycle_type === 'interval') {
    const step = Math.max(1, habit.interval_days)
    return diffDays(habit.start_date, date) % step === 0
  }
  return true
}

export interface HabitStats {
  /** 当前周期进度 */
  period: PeriodRange
  doneInPeriod: number
  percent: number
  /** 当前连续打卡天数 */
  streak: number
  bestStreak: number
  total: number
  /** 近 30 天完成率 */
  rate30: number
  /** 习惯养成里程碑（21 / 66 天） */
  daysTracked: number
  todayDone: boolean
}

const checkinSet = (checkins: Checkin[]) => new Set(checkins.map((c) => c.date))

export function habitStats(habit: Habit, checkins: Checkin[], ref = today()): HabitStats {
  const set = checkinSet(checkins.filter((c) => c.habit_id === habit.id))
  const period = currentPeriod(habit, ref)
  const doneInPeriod = eachDay(period.start, period.end).filter((d) => set.has(d)).length
  const percent = Math.min(100, Math.round((doneInPeriod / period.target) * 100))

  // 连续打卡：从今天（未打卡则从昨天）往回数，只统计「应打卡」的日子
  let cursor = set.has(ref) ? ref : addDays(ref, -1)
  let streak = 0
  let guard = 0
  while (guard < 3650) {
    if (cursor < habit.start_date) break
    if (isScheduledDay(habit, cursor)) {
      if (set.has(cursor)) {
        streak++
        cursor = addDays(cursor, -1)
      } else break
    } else if (habit.cycle_type === 'interval' || habit.cycle_type === 'weekdays') {
      cursor = addDays(cursor, -1)
    } else break
    guard++
  }

  const sorted = Array.from(set).sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev && diffDays(prev, d) === 1) run++
    else run = 1
    best = Math.max(best, run)
    prev = d
  }

  const last30 = eachDay(addDays(ref, -29), ref)
  const scheduled30 = last30.filter((d) => isScheduledDay(habit, d))
  const done30 = scheduled30.filter((d) => set.has(d)).length

  const daysTracked = Math.max(0, diffDays(habit.start_date, ref)) + 1

  return {
    period,
    doneInPeriod,
    percent,
    streak,
    bestStreak: Math.max(best, streak),
    total: set.size,
    rate30: scheduled30.length ? Math.round((done30 / scheduled30.length) * 100) : 0,
    daysTracked,
    todayDone: set.has(ref),
  }
}

export interface DailyPoint {
  date: string
  value: number
}

export function completionTrend(tasks: Task[], days = 14, ref = today()): DailyPoint[] {
  const range = eachDay(addDays(ref, -(days - 1)), ref)
  const doneByDate = new Map<string, number>()
  tasks
    .filter((t) => t.completed_at)
    .forEach((t) => {
      const d = t.completed_at!.slice(0, 10)
      doneByDate.set(d, (doneByDate.get(d) ?? 0) + 1)
    })
  return range.map((date) => ({ date, value: doneByDate.get(date) ?? 0 }))
}

export function moodTrend(journals: Journal[], days = 30, ref = today()): (DailyPoint & { mood: number })[] {
  const map = new Map(journals.map((j) => [j.date, j.mood]))
  return eachDay(addDays(ref, -(days - 1)), ref).map((date) => ({
    date,
    value: map.get(date) ?? 0,
    mood: map.get(date) ?? 0,
  }))
}

export interface Overview {
  doingTasks: number
  todoTasks: number
  dueSoon: number
  overdue: number
  doneThisWeek: number
  doneThisMonth: number
  habitsTotal: number
  habitsPendingToday: number
  habitRateToday: number
  journalCount30: number
  journalStreak: number
  avgMood: number
  focusMinutesWeek: number
}

export function overview(
  tasks: Task[],
  habits: Habit[],
  checkins: Checkin[],
  journals: Journal[],
  ref = today(),
): Overview {
  const weekStart = startOfWeek(ref)
  const monthStart = startOfMonth(ref)
  const active = tasks.filter((t) => t.status !== 'archived')
  const doneThisWeek = tasks.filter(
    (t) => t.completed_at && t.completed_at.slice(0, 10) >= weekStart,
  ).length
  const doneThisMonth = tasks.filter(
    (t) => t.completed_at && t.completed_at.slice(0, 10) >= monthStart,
  ).length

  const activeHabits = habits.filter((h) => !h.archived)
  const pendingToday = activeHabits.filter((h) => {
    if (!isScheduledDay(h, ref)) return false
    return !checkins.some((c) => c.habit_id === h.id && c.date === ref)
  }).length
  const scheduledToday = activeHabits.filter((h) => isScheduledDay(h, ref)).length

  const last30 = eachDay(addDays(ref, -29), ref)
  const journalDates = new Set(journals.map((j) => j.date))
  const journalCount30 = last30.filter((d) => journalDates.has(d)).length
  let jStreak = 0
  let cursor = journalDates.has(ref) ? ref : addDays(ref, -1)
  while (journalDates.has(cursor)) {
    jStreak++
    cursor = addDays(cursor, -1)
  }
  const moods = journals.filter((j) => j.mood > 0).map((j) => j.mood)
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0

  return {
    doingTasks: active.filter((t) => t.status === 'doing').length,
    todoTasks: active.filter((t) => t.status === 'todo').length,
    dueSoon: active.filter(
      (t) => t.due_date && t.status !== 'done' && diffDays(ref, t.due_date) >= 0 && diffDays(ref, t.due_date) <= 3,
    ).length,
    overdue: active.filter((t) => t.due_date && t.status !== 'done' && t.due_date < ref).length,
    doneThisWeek,
    doneThisMonth,
    habitsTotal: activeHabits.length,
    habitsPendingToday: pendingToday,
    habitRateToday: scheduledToday
      ? Math.round(((scheduledToday - pendingToday) / scheduledToday) * 100)
      : 100,
    journalCount30,
    journalStreak: jStreak,
    avgMood,
    focusMinutesWeek: tasks
      .filter((t) => t.completed_at && t.completed_at.slice(0, 10) >= weekStart)
      .reduce((sum, t) => sum + (t.spent_minutes || 0), 0),
  }
}
