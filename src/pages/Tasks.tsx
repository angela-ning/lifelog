import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, LayoutGrid, List, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import { diffDays, formatDate, today } from '../lib/date'
import {
  DOMAINS,
  QUADRANT_META,
  STATUS_META,
  type Quadrant,
  type Task,
  type TaskStatus,
} from '../lib/types'
import { Empty, ProgressBar, Ring, Segmented } from '../components/ui'
import { TaskFormModal } from '../components/TaskFormModal'

type SortKey = 'created' | 'due' | 'progress' | 'priority'

const QUADRANT_ORDER: Quadrant[] = ['q1', 'q2', 'q3', 'q4']
const PRIORITY_ORDER: Record<Quadrant, number> = { q1: 0, q2: 1, q3: 2, q4: 3 }

export function Tasks() {
  const { user, tasks, tags, reload } = useApp()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'all' | TaskStatus>('all')
  const [quadrant, setQuadrant] = useState<'all' | Quadrant>('all')
  const [domain, setDomain] = useState('all')
  const [tagIds, setTagIds] = useState<string[]>([])
  const [sort, setSort] = useState<SortKey>('priority')
  const [view, setView] = useState<'list' | 'matrix'>('list')
  const [creating, setCreating] = useState(false)
  const ref = today()

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase()
    let list = tasks.filter((t) => {
      if (status === 'all' ? t.status === 'archived' : t.status !== status) return false
      if (quadrant !== 'all' && t.quadrant !== quadrant) return false
      if (domain !== 'all' && t.domain !== domain) return false
      if (tagIds.length && !tagIds.some((id) => t.tag_ids.includes(id))) return false
      if (kw && !(t.title + t.summary + t.content_md).toLowerCase().includes(kw)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      if (sort === 'due') return (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : 1
      if (sort === 'progress') return b.progress - a.progress
      if (sort === 'priority') return PRIORITY_ORDER[a.quadrant] - PRIORITY_ORDER[b.quadrant]
      return a.created_at < b.created_at ? 1 : -1
    })
    return list
  }, [tasks, q, status, quadrant, domain, tagIds, sort])

  async function toggleDone(task: Task) {
    if (!user) return
    await repo.updateTask(user.id, task.id, { status: task.status === 'done' ? 'todo' : 'done' })
    await reload()
  }

  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  function renderTask(task: Task) {
    const overdue = !!task.due_date && task.due_date < ref && task.status !== 'done'
    return (
      <div className="task-row" key={task.id} onClick={() => nav(`/tasks/${task.id}`)}>
        <button
          className={`task-check${task.status === 'done' ? ' done' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            void toggleDone(task)
          }}
          title={task.status === 'done' ? '标记为未完成' : '标记为完成'}
        >
          {task.status === 'done' && <CheckCircle2 size={14} />}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p className="title">{task.title}</p>
          {task.summary && <p className="summary">{task.summary}</p>}
          <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
            <span
              className="badge"
              style={{
                color: QUADRANT_META[task.quadrant].color,
                background: `${QUADRANT_META[task.quadrant].color}14`,
                borderColor: `${QUADRANT_META[task.quadrant].color}33`,
              }}
            >
              {QUADRANT_META[task.quadrant].label}
            </span>
            <span className="badge">{task.domain}</span>
            {task.due_date && (
              <span
                className="badge"
                style={overdue ? { color: 'var(--danger)', background: 'var(--danger-soft)' } : undefined}
              >
                {overdue ? '逾期 ' : '截止 '}
                {formatDate(task.due_date, 'month')}
              </span>
            )}
            {task.tag_ids.map((id) => {
              const tag = tagMap.get(id)
              if (!tag) return null
              return (
                <span className="tag" key={id} style={{ color: tag.color }}>
                  <i className="tag-dot" style={{ background: tag.color }} />
                  {tag.name}
                </span>
              )
            })}
          </div>
          <div style={{ marginTop: 8 }}>
            <ProgressBar value={task.progress} slim color={task.status === 'done' ? 'var(--success)' : undefined} />
          </div>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
          <Ring percent={task.progress} size={42} stroke={5} color={task.status === 'done' ? 'var(--success)' : undefined}>
            <span style={{ fontSize: 10 }}>{task.progress}%</span>
          </Ring>
          <span className="muted small">{STATUS_META[task.status].label}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <div className="row wrap" style={{ gap: 8 }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-3)' }} />
            <input
              className="input"
              style={{ paddingLeft: 30 }}
              placeholder="搜索标题、摘要或正文"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="select" style={{ width: 130 }} value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="all">全部领域</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            className="select"
            style={{ width: 150 }}
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value as 'all' | Quadrant)}
          >
            <option value="all">全部优先级</option>
            {QUADRANT_ORDER.map((k) => (
              <option key={k} value={k}>
                {QUADRANT_META[k].label}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 130 }} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="priority">按优先级</option>
            <option value="due">按截止日</option>
            <option value="progress">按进度</option>
            <option value="created">按创建时间</option>
          </select>
          <div style={{ flex: 1 }} />
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: <span className="row" style={{ gap: 4 }}><List size={13} /> 列表</span> as unknown as string },
              { value: 'matrix', label: <span className="row" style={{ gap: 4 }}><LayoutGrid size={13} /> 四象限</span> as unknown as string },
            ]}
          />
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={14} /> 新建任务
          </button>
        </div>

        <div className="row wrap" style={{ gap: 8, marginTop: 10 }}>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: '全部' },
              { value: 'todo', label: '待办' },
              { value: 'doing', label: '进行中' },
              { value: 'done', label: '已完成' },
              { value: 'archived', label: '已归档' },
            ]}
          />
          <div className="chip-row">
            {tags.map((t) => {
              const active = tagIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  className={`tag${active ? ' active' : ''}`}
                  style={active ? { color: t.color } : undefined}
                  onClick={() => setTagIds((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                >
                  <i className="tag-dot" style={{ background: t.color }} />
                  {t.name}
                </button>
              )
            })}
            {tagIds.length > 0 && (
              <button className="btn ghost sm" onClick={() => setTagIds([])}>
                清空标签
              </button>
            )}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty
          emoji="🗂️"
          text="没有符合条件的任务"
          action={
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> 新建任务
            </button>
          }
        />
      ) : view === 'list' ? (
        <div className="col" style={{ gap: 10, marginTop: 12 }}>
          {filtered.map(renderTask)}
        </div>
      ) : (
        <div className="grid cols-2" style={{ marginTop: 12 }}>
          {QUADRANT_ORDER.map((qk) => {
            const list = filtered.filter((t) => t.quadrant === qk)
            return (
              <div className="card" key={qk} style={{ background: `${QUADRANT_META[qk].color}08` }}>
                <div className="card-head">
                  <h3 className="card-title" style={{ color: QUADRANT_META[qk].color }}>
                    {QUADRANT_META[qk].label}
                  </h3>
                  <div className="spacer" />
                  <span className="muted small">{QUADRANT_META[qk].hint}</span>
                </div>
                {list.length === 0 ? (
                  <p className="muted small">—</p>
                ) : (
                  <div className="col" style={{ gap: 8 }}>
                    {list.map((t) => (
                      <div
                        key={t.id}
                        className="task-row"
                        style={{ background: 'var(--surface)' }}
                        onClick={() => nav(`/tasks/${t.id}`)}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="title">{t.title}</p>
                          <div className="muted small">
                            {t.due_date ? `截止 ${formatDate(t.due_date, 'month')}` : '无截止日'} ·{' '}
                            {diffDays(ref, t.due_date ?? ref) >= 0 ? '还有时间' : '已逾期'}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <ProgressBar value={t.progress} slim color={QUADRANT_META[qk].color} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
    </>
  )
}

export function TasksFilterHint() {
  return (
    <p className="muted small">
      <SlidersHorizontal size={12} style={{ verticalAlign: -2 }} /> 用四象限区分「重要」与「紧急」，把时间多留给重要不紧急的事。
    </p>
  )
}
