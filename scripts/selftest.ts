/** 临时自检脚本：验证日期与打卡统计的核心计算（非应用代码，验证后删除） */
import {
  addDays,
  diffDays,
  eachDay,
  endOfMonth,
  startOfMonth,
  startOfWeek,
  today,
  weekKey,
} from '../src/lib/date'
import { currentPeriod, habitStats, isScheduledDay } from '../src/lib/stats'
import type { Checkin, Habit } from '../src/lib/types'

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` → 实际 ${JSON.stringify(actual)}，期望 ${JSON.stringify(expected)}`}`)
  if (!ok) failed++
}

const ref = '2026-09-29' // 周二

check('周一为一周起点', startOfWeek(ref), '2026-09-28')
check('ISO 周编号', weekKey(ref), '2026-W40')
check('加减天数', addDays('2026-09-29', 3), '2026-10-02')
check('日期差', diffDays('2026-09-01', '2026-09-29'), 28)
check('月初', startOfMonth(ref), '2026-09-01')
check('月末', endOfMonth('2026-02-10'), '2026-02-28')
check('区间天数', eachDay('2026-09-28', '2026-09-30').length, 3)

const daily: Habit = {
  id: 'h1',
  owner_id: 'u1',
  name: '阅读',
  description: '',
  color: '#4f46e5',
  emoji: '📚',
  cycle_type: 'daily',
  cycle_target: 1,
  weekdays: [1, 2, 3, 4, 5],
  interval_days: 2,
  start_date: addDays(ref, -9),
  end_date: null,
  archived: false,
  created_at: `${ref}T00:00:00.000Z`,
}

const c = (date: string, habitId = 'h1'): Checkin => ({
  id: `c-${date}`,
  owner_id: 'u1',
  habit_id: habitId,
  date,
  value: 1,
  note: '',
  created_at: `${date}T00:00:00.000Z`,
})

const s1 = habitStats(daily, [c(addDays(ref, -2)), c(addDays(ref, -1)), c(ref)], ref)
check('今日完成 → 周期 100%', s1.percent, 100)
check('连续天数（含今天）', s1.streak, 3)
check('累计次数', s1.total, 3)

const s2 = habitStats(daily, [c(addDays(ref, -2)), c(addDays(ref, -1))], ref)
check('今天未打卡 → 从昨天起算连续', s2.streak, 2)
check('今天未打卡 → 周期 0%', s2.percent, 0)

const weekly: Habit = { ...daily, id: 'h2', cycle_type: 'weekly', cycle_target: 3, start_date: addDays(ref, -60) }
// 本周为 09-28(周一) ~ 10-04；ref-1 是周一（本周内），ref-2 是上周日（不计入本周）
const s3 = habitStats(weekly, [c(addDays(ref, -1), 'h2'), c(ref, 'h2')], ref)
check('每周 N 次：周期范围为本周', currentPeriod(weekly, ref), {
  start: '2026-09-28',
  end: '2026-10-04',
  target: 3,
  label: '本周',
})
check('每周 N 次：完成 2/3', `${s3.doneInPeriod}/${s3.period.target}`, '2/3')
check('每周 N 次：进度 67%', s3.percent, 67)

const weekdays: Habit = { ...daily, id: 'h3', cycle_type: 'weekdays', weekdays: [1, 2, 3], start_date: addDays(ref, -60) }
check('指定星期：周二应打卡', isScheduledDay(weekdays, ref), true)
check('指定星期：周六不打卡', isScheduledDay(weekdays, addDays(ref, 4)), false)

const interval: Habit = { ...daily, id: 'h4', cycle_type: 'interval', interval_days: 3, start_date: addDays(ref, -6) }
check('每 N 天：第 6 天是周期日', isScheduledDay(interval, ref), true)
check('每 N 天：第 4 天不是周期日', isScheduledDay(interval, addDays(ref, -1)), false)
check('每 N 天：周期起点', currentPeriod(interval, ref).start, ref)

console.log(failed === 0 ? '\n全部自检通过 ✅' : `\n${failed} 项未通过 ❌`)
process.exit(failed === 0 ? 0 : 1)
