/**
 * 数据访问层
 *
 * 所有读写都以 owner_id 为条件（等价于云端的行级权限），
 * 页面层永远拿不到其他账号的数据。
 */
import { bulkPut, getAll, getOne, put, remove as dbRemove, uid } from './db'
import { nowISO, today } from './date'
import type {
  Attachment,
  AttachmentKind,
  Checkin,
  Habit,
  ID,
  Journal,
  PeriodType,
  Review,
  Tag,
  Task,
} from './types'

/* ---------------------------------- Tasks --------------------------------- */

export async function listTasks(ownerId: string): Promise<Task[]> {
  const all = await getAll<Task>('tasks')
  return all
    .filter((t) => t.owner_id === ownerId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export async function getTask(ownerId: string, id: ID): Promise<Task | null> {
  const t = await getOne<Task>('tasks', id)
  return t && t.owner_id === ownerId ? t : null
}

export async function createTask(ownerId: string, draft: Partial<Task>): Promise<Task> {
  const ts = nowISO()
  const checklist = draft.checklist ?? []
  const task: Task = {
    id: uid('t_'),
    owner_id: ownerId,
    title: draft.title?.trim() || '未命名任务',
    summary: draft.summary ?? '',
    content_md: draft.content_md ?? '',
    status: draft.status ?? 'todo',
    quadrant: draft.quadrant ?? 'q2',
    domain: draft.domain ?? '生活',
    progress: draft.progress ?? 0,
    due_date: draft.due_date ?? null,
    start_date: draft.start_date ?? null,
    completed_at: draft.completed_at ?? null,
    estimate_minutes: draft.estimate_minutes ?? 0,
    spent_minutes: draft.spent_minutes ?? 0,
    checklist,
    tag_ids: draft.tag_ids ?? [],
    pinned: draft.pinned ?? false,
    created_at: ts,
    updated_at: ts,
  }
  task.progress = autoProgress(task)
  await put('tasks', task)
  return task
}

export async function updateTask(ownerId: string, id: ID, patch: Partial<Task>): Promise<Task | null> {
  const cur = await getTask(ownerId, id)
  if (!cur) return null
  const next: Task = { ...cur, ...patch, id: cur.id, owner_id: cur.owner_id, updated_at: nowISO() }
  if (patch.checklist || next.checklist.length) next.progress = autoProgress(next)
  if (next.status === 'done' && !next.completed_at) next.completed_at = nowISO()
  if (next.status !== 'done') next.completed_at = null
  if (next.status === 'done') next.progress = 100
  await put('tasks', next)
  return next
}

/** 子清单有内容时，进度由清单完成比例自动推导 */
export function autoProgress(task: Task): number {
  if (!task.checklist || task.checklist.length === 0) return task.progress
  const done = task.checklist.filter((c) => c.done).length
  return Math.round((done / task.checklist.length) * 100)
}

export async function deleteTask(ownerId: string, id: ID): Promise<boolean> {
  const cur = await getTask(ownerId, id)
  if (!cur) return false
  await dbRemove('tasks', id)
  const atts = await listAttachments(ownerId, 'task', id)
  for (const a of atts) await deleteAttachment(ownerId, a.id)
  return true
}

/* ----------------------------------- Tags --------------------------------- */

export async function listTags(ownerId: string): Promise<Tag[]> {
  const all = await getAll<Tag>('tags')
  return all.filter((t) => t.owner_id === ownerId).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

export async function ensureTag(ownerId: string, name: string, color?: string): Promise<Tag> {
  const tags = await listTags(ownerId)
  const found = tags.find((t) => t.name === name)
  if (found) return found
  const tag: Tag = {
    id: uid('g_'),
    owner_id: ownerId,
    name,
    color: color ?? '#4f46e5',
    created_at: nowISO(),
  }
  await put('tags', tag)
  return tag
}

export async function createTag(ownerId: string, name: string, color: string): Promise<Tag> {
  return ensureTag(ownerId, name.trim(), color)
}

export async function deleteTag(ownerId: string, id: ID): Promise<void> {
  const tag = await getOne<Tag>('tags', id)
  if (!tag || tag.owner_id !== ownerId) return
  await dbRemove('tags', id)
  const tasks = await listTasks(ownerId)
  for (const t of tasks) {
    if (t.tag_ids.includes(id)) {
      await put('tasks', { ...t, tag_ids: t.tag_ids.filter((x) => x !== id) })
    }
  }
}

/* ---------------------------------- Habits -------------------------------- */

export async function listHabits(ownerId: string, includeArchived = false): Promise<Habit[]> {
  const all = await getAll<Habit>('habits')
  return all
    .filter((h) => h.owner_id === ownerId && (includeArchived || !h.archived))
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

export async function createHabit(ownerId: string, draft: Partial<Habit>): Promise<Habit> {
  const habit: Habit = {
    id: uid('h_'),
    owner_id: ownerId,
    name: draft.name?.trim() || '未命名打卡',
    description: draft.description ?? '',
    color: draft.color ?? '#4f46e5',
    emoji: draft.emoji ?? '✅',
    cycle_type: draft.cycle_type ?? 'daily',
    cycle_target: draft.cycle_target ?? 1,
    weekdays: draft.weekdays ?? [1, 2, 3, 4, 5],
    interval_days: draft.interval_days ?? 2,
    start_date: draft.start_date ?? today(),
    end_date: draft.end_date ?? null,
    archived: false,
    created_at: nowISO(),
  }
  await put('habits', habit)
  return habit
}

export async function updateHabit(ownerId: string, id: ID, patch: Partial<Habit>): Promise<Habit | null> {
  const cur = await getOne<Habit>('habits', id)
  if (!cur || cur.owner_id !== ownerId) return null
  const next = { ...cur, ...patch, id: cur.id, owner_id: cur.owner_id }
  await put('habits', next)
  return next
}

export async function deleteHabit(ownerId: string, id: ID): Promise<boolean> {
  const cur = await getOne<Habit>('habits', id)
  if (!cur || cur.owner_id !== ownerId) return false
  await dbRemove('habits', id)
  const checkins = await listCheckins(ownerId)
  for (const c of checkins.filter((c) => c.habit_id === id)) await dbRemove('checkins', c.id)
  return true
}

/* --------------------------------- Checkins ------------------------------- */

export async function listCheckins(ownerId: string, habitId?: ID): Promise<Checkin[]> {
  const all = await getAll<Checkin>('checkins')
  return all
    .filter((c) => c.owner_id === ownerId && (!habitId || c.habit_id === habitId))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export async function toggleCheckin(
  ownerId: string,
  habitId: ID,
  date: string,
  note = '',
): Promise<Checkin | null> {
  const all = await listCheckins(ownerId, habitId)
  const existing = all.find((c) => c.date === date)
  if (existing) {
    await dbRemove('checkins', existing.id)
    return null
  }
  const checkin: Checkin = {
    id: uid('c_'),
    owner_id: ownerId,
    habit_id: habitId,
    date,
    value: 1,
    note,
    created_at: nowISO(),
  }
  await put('checkins', checkin)
  return checkin
}

export async function updateCheckinNote(
  ownerId: string,
  id: ID,
  note: string,
): Promise<Checkin | null> {
  const cur = await getOne<Checkin>('checkins', id)
  if (!cur || cur.owner_id !== ownerId) return null
  const next = { ...cur, note }
  await put('checkins', next)
  return next
}

/* --------------------------------- Journals ------------------------------- */

export async function listJournals(ownerId: string): Promise<Journal[]> {
  const all = await getAll<Journal>('journals')
  return all
    .filter((j) => j.owner_id === ownerId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

export async function getJournal(ownerId: string, id: ID): Promise<Journal | null> {
  const j = await getOne<Journal>('journals', id)
  return j && j.owner_id === ownerId ? j : null
}

export async function getJournalByDate(ownerId: string, date: string): Promise<Journal | null> {
  const all = await listJournals(ownerId)
  return all.find((j) => j.date === date) ?? null
}

export async function upsertJournal(ownerId: string, draft: Partial<Journal>): Promise<Journal> {
  const ts = nowISO()
  if (draft.id) {
    const cur = await getJournal(ownerId, draft.id)
    if (cur) {
      const next: Journal = { ...cur, ...draft, id: cur.id, owner_id: cur.owner_id, updated_at: ts }
      await put('journals', next)
      return next
    }
  }
  const existing = draft.date ? await getJournalByDate(ownerId, draft.date) : null
  if (existing) {
    const next: Journal = { ...existing, ...draft, id: existing.id, owner_id: ownerId, updated_at: ts }
    await put('journals', next)
    return next
  }
  const journal: Journal = {
    id: uid('j_'),
    owner_id: ownerId,
    date: draft.date ?? today(),
    title: draft.title ?? '',
    content_md: draft.content_md ?? '',
    mood: draft.mood ?? 3,
    energy: draft.energy ?? 3,
    weather: draft.weather ?? '',
    location: draft.location ?? '',
    tag_ids: draft.tag_ids ?? [],
    created_at: ts,
    updated_at: ts,
  }
  await put('journals', journal)
  return journal
}

export async function deleteJournal(ownerId: string, id: ID): Promise<boolean> {
  const cur = await getJournal(ownerId, id)
  if (!cur) return false
  await dbRemove('journals', id)
  const atts = await listAttachments(ownerId, 'journal', id)
  for (const a of atts) await deleteAttachment(ownerId, a.id)
  return true
}

/* --------------------------------- Reviews -------------------------------- */

export async function listReviews(ownerId: string): Promise<Review[]> {
  const all = await getAll<Review>('reviews')
  return all
    .filter((r) => r.owner_id === ownerId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

export async function upsertReview(
  ownerId: string,
  draft: Partial<Review> & { period_type: PeriodType; period_key: string },
): Promise<Review> {
  const all = await listReviews(ownerId)
  const existing = all.find(
    (r) => r.period_type === draft.period_type && r.period_key === draft.period_key,
  )
  if (existing) {
    const next: Review = { ...existing, ...draft, id: existing.id, owner_id: ownerId }
    await put('reviews', next)
    return next
  }
  const review: Review = {
    id: uid('r_'),
    owner_id: ownerId,
    period_type: draft.period_type,
    period_key: draft.period_key,
    title: draft.title ?? `${draft.period_key} 复盘`,
    content_md: draft.content_md ?? '',
    score: draft.score ?? 7,
    created_at: nowISO(),
  }
  await put('reviews', review)
  return review
}

export async function deleteReview(ownerId: string, id: ID): Promise<void> {
  const r = await getOne<Review>('reviews', id)
  if (!r || r.owner_id !== ownerId) return
  await dbRemove('reviews', id)
}

/* ------------------------------- Attachments ------------------------------ */

export function detectKind(name: string, mime = ''): AttachmentKind {
  const lower = name.toLowerCase()
  if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.txt')) return 'markdown'
  if (lower.endsWith('.pdf')) return 'pdf'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'word'
  if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(lower) || mime.startsWith('image/')) return 'image'
  return 'other'
}

export async function listAttachments(
  ownerId: string,
  refType?: 'task' | 'journal' | 'review',
  refId?: ID,
): Promise<Attachment[]> {
  const all = await getAll<Attachment>('attachments')
  return all
    .filter(
      (a) =>
        a.owner_id === ownerId && (!refType || a.ref_type === refType) && (!refId || a.ref_id === refId),
    )
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
}

export async function saveAttachment(
  ownerId: string,
  refType: 'task' | 'journal' | 'review',
  refId: ID,
  file: File,
): Promise<Attachment> {
  const storageKey = `${ownerId}/${uid('f_')}-${file.name.replace(/[^\w.\-一-龥]/g, '_')}`
  await put('files', {
    key: storageKey,
    owner_id: ownerId,
    name: file.name,
    mime: file.type,
    size: file.size,
    blob: file,
    created_at: nowISO(),
  })
  const att: Attachment = {
    id: uid('a_'),
    owner_id: ownerId,
    ref_type: refType,
    ref_id: refId,
    name: file.name,
    size: file.size,
    mime: file.type,
    kind: detectKind(file.name, file.type),
    storage_key: storageKey,
    created_at: nowISO(),
  }
  await put('attachments', att)
  return att
}

export async function getFile(key: string): Promise<File | null> {
  const rec = await getOne<{ key: string; blob: Blob; name: string; mime: string }>('files', key)
  if (!rec) return null
  const blob = rec.blob
  if (blob instanceof File) return blob
  return new File([blob], rec.name, { type: rec.mime })
}

export async function deleteAttachment(ownerId: string, id: ID): Promise<void> {
  const att = await getOne<Attachment>('attachments', id)
  if (!att || att.owner_id !== ownerId) return
  await dbRemove('attachments', id)
  try {
    await dbRemove('files', att.storage_key)
  } catch {
    /* 文件可能已不存在 */
  }
}

/* ------------------------------- 导入 / 导出 ------------------------------ */

export interface BackupPayload {
  version: 1
  exported_at: string
  owner_id: string
  tasks: Task[]
  habits: Habit[]
  checkins: Checkin[]
  journals: Journal[]
  reviews: Review[]
  tags: Tag[]
  attachments: Attachment[]
}

export async function exportBackup(ownerId: string): Promise<BackupPayload> {
  return {
    version: 1,
    exported_at: nowISO(),
    owner_id: ownerId,
    tasks: await listTasks(ownerId),
    habits: await listHabits(ownerId, true),
    checkins: await listCheckins(ownerId),
    journals: await listJournals(ownerId),
    reviews: await listReviews(ownerId),
    tags: await listTags(ownerId),
    attachments: await listAttachments(ownerId),
  }
}

export async function importBackup(ownerId: string, data: BackupPayload): Promise<void> {
  const stamp = (rows: { owner_id?: string }[]) => rows.map((r) => ({ ...r, owner_id: ownerId }))
  await bulkPut('tasks', stamp(data.tasks ?? []) as Task[])
  await bulkPut('habits', stamp(data.habits ?? []) as Habit[])
  await bulkPut('checkins', stamp(data.checkins ?? []) as Checkin[])
  await bulkPut('journals', stamp(data.journals ?? []) as Journal[])
  await bulkPut('reviews', stamp(data.reviews ?? []) as Review[])
  await bulkPut('tags', stamp(data.tags ?? []) as Tag[])
  await bulkPut('attachments', stamp(data.attachments ?? []) as Attachment[])
}

export async function deleteOwnerData(ownerId: string): Promise<void> {
  const tasks = await listTasks(ownerId)
  for (const t of tasks) await deleteTask(ownerId, t.id)
  const habits = await listHabits(ownerId, true)
  for (const h of habits) await deleteHabit(ownerId, h.id)
  const journals = await listJournals(ownerId)
  for (const j of journals) await deleteJournal(ownerId, j.id)
  const reviews = await listReviews(ownerId)
  for (const r of reviews) await deleteReview(ownerId, r.id)
  const tags = await listTags(ownerId)
  for (const t of tags) await dbRemove('tags', t.id)
  const atts = await listAttachments(ownerId)
  for (const a of atts) await deleteAttachment(ownerId, a.id)
  const checkins = await listCheckins(ownerId)
  for (const c of checkins) await dbRemove('checkins', c.id)
}
