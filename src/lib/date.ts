/** 日期工具：全部以本地时区 YYYY-MM-DD 字符串为准 */

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function today(): string {
  return toISO(new Date())
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addMonths(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setMonth(d.getMonth() + n)
  return toISO(d)
}

/** b - a，单位天 */
export function diffDays(a: string, b: string): number {
  const da = parseISO(a).getTime()
  const db = parseISO(b).getTime()
  return Math.round((db - da) / 86400000)
}

export function startOfWeek(iso: string, weekStartsOn = 1): string {
  const d = parseISO(iso)
  const dow = d.getDay()
  const delta = (dow - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - delta)
  return toISO(d)
}

export function endOfWeek(iso: string, weekStartsOn = 1): string {
  return addDays(startOfWeek(iso, weekStartsOn), 6)
}

export function startOfMonth(iso: string): string {
  const d = parseISO(iso)
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function endOfMonth(iso: string): string {
  const d = parseISO(iso)
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/** ISO 周编号，例如 2026-W40 */
export function weekKey(iso: string): string {
  const d = parseISO(iso)
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${`${week}`.padStart(2, '0')}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function quarterKey(iso: string): string {
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7))
  return `${y}-Q${Math.ceil(m / 3)}`
}

export function weekdayLabel(iso: string): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseISO(iso).getDay()]
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六']

export function weekdayShort(dow: number): string {
  return WEEKDAY_SHORT[dow]
}

/** 生成从 start 到 end（含）的日期数组 */
export function eachDay(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  let guard = 0
  while (diffDays(cur, end) >= 0 && guard < 4000) {
    out.push(cur)
    cur = addDays(cur, 1)
    guard++
  }
  return out
}

export function formatDate(iso: string, style: 'short' | 'long' | 'month' = 'short'): string {
  if (!iso) return ''
  const d = parseISO(iso)
  if (style === 'long') return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
  if (style === 'month') return `${d.getMonth() + 1}/${d.getDate()}`
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

export function relativeDay(iso: string): string {
  const diff = diffDays(today(), iso)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  if (diff > 1) return `${diff} 天后`
  return `${-diff} 天前`
}

export function formatDateTime(isoTs: string): string {
  const d = new Date(isoTs)
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')} ${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`
}
