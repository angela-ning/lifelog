/**
 * 数据模型定义
 *
 * 说明：字段命名（owner_id / created_at 等）与云端 Postgres 版本保持一致，
 * 便于后续把本地存储层整体替换为云端数据库，而不用改动业务代码。
 */

export type ID = string

/** 任务状态：待办 / 进行中 / 已完成 / 已归档 */
export type TaskStatus = 'todo' | 'doing' | 'done' | 'archived'

/** 艾森豪威尔四象限：重要且紧急 / 重要不紧急 / 紧急不重要 / 不重要不紧急 */
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: ID
  owner_id: string
  title: string
  summary: string
  content_md: string
  status: TaskStatus
  quadrant: Quadrant
  domain: string
  progress: number
  due_date: string | null
  start_date: string | null
  completed_at: string | null
  estimate_minutes: number
  spent_minutes: number
  checklist: ChecklistItem[]
  tag_ids: string[]
  pinned: boolean
  created_at: string
  updated_at: string
}

/** 打卡周期类型 */
export type CycleType =
  | 'daily' // 每天
  | 'weekdays' // 每周指定星期几
  | 'weekly' // 每周 N 次
  | 'monthly' // 每月 N 次
  | 'interval' // 每 N 天一次

export interface Habit {
  id: ID
  owner_id: string
  name: string
  description: string
  color: string
  emoji: string
  cycle_type: CycleType
  /** 一个周期内的目标次数 */
  cycle_target: number
  /** cycle_type = weekdays 时生效：0=周日 … 6=周六 */
  weekdays: number[]
  /** cycle_type = interval 时生效 */
  interval_days: number
  start_date: string
  end_date: string | null
  archived: boolean
  created_at: string
}

export interface Checkin {
  id: ID
  owner_id: string
  habit_id: ID
  /** YYYY-MM-DD */
  date: string
  /** 本次完成量，默认 1 */
  value: number
  note: string
  created_at: string
}

export interface Journal {
  id: ID
  owner_id: string
  /** YYYY-MM-DD */
  date: string
  title: string
  content_md: string
  /** 心情 1-5 */
  mood: number
  /** 精力 1-5 */
  energy: number
  weather: string
  location: string
  tag_ids: string[]
  created_at: string
  updated_at: string
}

export type AttachmentKind = 'markdown' | 'pdf' | 'word' | 'image' | 'other'
export type RefType = 'task' | 'journal' | 'review'

export interface Attachment {
  id: ID
  owner_id: string
  ref_type: RefType
  ref_id: ID
  name: string
  size: number
  mime: string
  kind: AttachmentKind
  /** 本地存储层中的对象键（迁移到云端后即 storage path） */
  storage_key: string
  created_at: string
}

export interface Tag {
  id: ID
  owner_id: string
  name: string
  color: string
  created_at: string
}

export type PeriodType = 'week' | 'month' | 'quarter'

export interface Review {
  id: ID
  owner_id: string
  period_type: PeriodType
  /** 例如 2026-W40 / 2026-09 / 2026-Q3 */
  period_key: string
  title: string
  content_md: string
  /** 自评分 1-10 */
  score: number
  created_at: string
}

export interface Settings {
  owner_id: string
  key: string
  value: string
}

export interface UserProfile {
  id: string
  email: string
  display_name: string
  avatar_color: string
  bio: string
  created_at: string
}

export const DOMAINS = ['工作', '学习', '健康', '生活', '关系', '财务'] as const

export const QUADRANT_META: Record<Quadrant, { label: string; hint: string; color: string }> = {
  q1: { label: '重要且紧急', hint: '马上做', color: '#dc2626' },
  q2: { label: '重要不紧急', hint: '计划做 · 高价值区', color: '#4f46e5' },
  q3: { label: '紧急不重要', hint: '委托或快速处理', color: '#d97706' },
  q4: { label: '不重要不紧急', hint: '尽量不做', color: '#64748b' },
}

export const STATUS_META: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: '待办', color: '#64748b' },
  doing: { label: '进行中', color: '#4f46e5' },
  done: { label: '已完成', color: '#16a34a' },
  archived: { label: '已归档', color: '#94a3b8' },
}

export const CYCLE_META: Record<CycleType, { label: string; hint: string }> = {
  daily: { label: '每天', hint: '每日打卡一次' },
  weekdays: { label: '指定星期', hint: '只在选定的星期几打卡' },
  weekly: { label: '每周 N 次', hint: '一周内完成 N 次即可' },
  monthly: { label: '每月 N 次', hint: '一个月内完成 N 次即可' },
  interval: { label: '每 N 天', hint: '按固定间隔循环打卡' },
}

export const TAG_COLORS = [
  '#4f46e5',
  '#0891b2',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#7c3aed',
  '#0d9488',
]
