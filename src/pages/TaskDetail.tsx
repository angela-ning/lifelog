import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Plus,
  Save,
  Trash2,
  Timer,
} from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import { uid } from '../lib/db'
import { formatDate, formatDateTime, today } from '../lib/date'
import { QUADRANT_META, STATUS_META, type Task, type TaskStatus } from '../lib/types'
import { Confirm, Empty, Field, ProgressBar, Ring } from '../components/ui'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { AttachmentPanel } from '../components/AttachmentPanel'
import { TaskFormModal } from '../components/TaskFormModal'

export function TaskDetail() {
  const { id = '' } = useParams()
  const { user, tasks, reload, toast } = useApp()
  const nav = useNavigate()
  const task = tasks.find((t) => t.id === id) ?? null

  const [draft, setDraft] = useState<Task | null>(null)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newItem, setNewItem] = useState('')
  const ref = today()

  useEffect(() => {
    setDraft(task)
  }, [task])

  const dirty = useMemo(() => {
    if (!draft || !task) return false
    return draft.content_md !== task.content_md
  }, [draft, task])

  if (!user) return null

  if (!task || !draft) {
    return (
      <Empty
        emoji="🔍"
        text="任务不存在或已被删除"
        action={
          <button className="btn" onClick={() => nav('/tasks')}>
            返回任务列表
          </button>
        }
      />
    )
  }

  async function patch(p: Partial<Task>) {
    if (!user) return
    const next = await repo.updateTask(user.id, task!.id, p)
    if (next) setDraft(next)
    await reload()
  }

  async function saveContent() {
    await patch({ content_md: draft!.content_md })
    toast('正文已保存', 'success')
  }

  async function setStatus(status: TaskStatus) {
    await patch({ status })
    toast(status === 'done' ? '任务已完成 🎉' : '状态已更新', 'success')
  }

  async function remove() {
    if (!user) return
    await repo.deleteTask(user.id, task!.id)
    await reload()
    nav('/tasks')
  }

  const overdue = !!draft.due_date && draft.due_date < ref && draft.status !== 'done'

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn ghost sm" onClick={() => nav('/tasks')}>
          <ArrowLeft size={14} /> 返回
        </button>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => setEditing(true)}>
          编辑属性
        </button>
        <button
          className="btn sm"
          onClick={() => void setStatus('archived')}
        >
          <Archive size={13} /> 归档
        </button>
        <button className="btn danger sm" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={13} /> 删除
        </button>
      </div>

      <div className="grid cols-3" style={{ alignItems: 'start', gridTemplateColumns: '2fr 1fr' }}>
        <div className="col">
          <div className="card">
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <Ring percent={draft.progress} size={54} stroke={6} color={draft.status === 'done' ? 'var(--success)' : undefined}>
                <span style={{ fontSize: 11 }}>{draft.progress}%</span>
              </Ring>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>{draft.title}</h2>
                <p className="muted small" style={{ margin: 0 }}>
                  {draft.summary || '（暂无摘要）'}
                </p>
                <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                  <span
                    className="badge"
                    style={{
                      color: QUADRANT_META[draft.quadrant].color,
                      background: `${QUADRANT_META[draft.quadrant].color}14`,
                    }}
                  >
                    {QUADRANT_META[draft.quadrant].label}
                  </span>
                  <span className="badge">{draft.domain}</span>
                  {draft.due_date && (
                    <span
                      className="badge"
                      style={overdue ? { color: 'var(--danger)', background: 'var(--danger-soft)' } : undefined}
                    >
                      <Clock size={11} /> {overdue ? '逾期' : '截止'} {formatDate(draft.due_date)}
                    </span>
                  )}
                  <span className="badge">{STATUS_META[draft.status].label}</span>
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="row wrap" style={{ gap: 6 }}>
              {(['todo', 'doing', 'done'] as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  className={`btn sm${draft.status === s ? ' primary' : ''}`}
                  onClick={() => void setStatus(s)}
                >
                  {s === 'done' && <CheckCircle2 size={13} />}
                  {STATUS_META[s].label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <span className="muted small">创建于 {formatDateTime(draft.created_at)}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="small" style={{ fontWeight: 600 }}>
                  进度
                </span>
                <span className="muted small">
                  {draft.checklist.length ? '由子清单自动计算' : '可手动调整'}
                </span>
              </div>
              <ProgressBar value={draft.progress} color={draft.status === 'done' ? 'var(--success)' : undefined} />
              {!draft.checklist.length && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={draft.progress}
                  style={{ width: '100%', marginTop: 6 }}
                  onChange={(e) => setDraft({ ...draft, progress: Number(e.target.value) })}
                  onMouseUp={(e) => void patch({ progress: Number((e.target as HTMLInputElement).value) })}
                />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">子清单</h3>
              <div className="spacer" />
              <span className="muted small">
                {draft.checklist.filter((c) => c.done).length}/{draft.checklist.length}
              </span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              {draft.checklist.map((item, idx) => (
                <div className="checklist-item" key={item.id}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => {
                      const next = draft.checklist.map((x, i) => (i === idx ? { ...x, done: !x.done } : x))
                      setDraft({ ...draft, checklist: next })
                      void patch({ checklist: next })
                    }}
                  />
                  <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : undefined, color: item.done ? 'var(--text-3)' : undefined }}>
                    {item.text}
                  </span>
                  <button
                    className="btn ghost sm"
                    onClick={() => {
                      const next = draft.checklist.filter((_, i) => i !== idx)
                      setDraft({ ...draft, checklist: next })
                      void patch({ checklist: next })
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input
                className="input"
                placeholder="添加下一步行动"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newItem.trim()) {
                    const next = [...draft.checklist, { id: uid('ci_'), text: newItem.trim(), done: false }]
                    setDraft({ ...draft, checklist: next })
                    void patch({ checklist: next })
                    setNewItem('')
                  }
                }}
              />
              <button
                className="btn"
                onClick={() => {
                  if (!newItem.trim()) return
                  const next = [...draft.checklist, { id: uid('ci_'), text: newItem.trim(), done: false }]
                  setDraft({ ...draft, checklist: next })
                  void patch({ checklist: next })
                  setNewItem('')
                }}
              >
                <Plus size={13} /> 添加
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">任务详情（Markdown）</h3>
              <div className="spacer" />
              {dirty && (
                <button className="btn primary sm" onClick={() => void saveContent()}>
                  <Save size={13} /> 保存正文
                </button>
              )}
            </div>
            <MarkdownEditor
              value={draft.content_md}
              onChange={(v) => setDraft({ ...draft, content_md: v })}
              minRows={14}
            />
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">附件</h3>
              <div className="spacer" />
              <span className="muted small">支持 Markdown / PDF / Word / 图片</span>
            </div>
            <AttachmentPanel
              ownerId={user.id}
              refType="task"
              refId={draft.id}
              onInsert={(md) => {
                setDraft({ ...draft, content_md: `${draft.content_md}\n\n${md}\n` })
                toast('已插入正文，记得保存', 'success')
              }}
            />
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">时间投入</h3>
            </div>
            <div className="kv">
              <span>预估</span>
              <b>{draft.estimate_minutes} 分钟</b>
            </div>
            <div className="kv">
              <span>已投入</span>
              <b>{draft.spent_minutes} 分钟</b>
            </div>
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              {[15, 25, 50].map((m) => (
                <button
                  key={m}
                  className="btn sm"
                  onClick={() => void patch({ spent_minutes: draft.spent_minutes + m })}
                >
                  <Timer size={12} /> +{m} 分钟
                </button>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>
              番茄工作法建议以 25 分钟为一个专注单元，记录投入有助于复盘时间去向。
            </p>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">属性</h3>
            </div>
            <Field label="所属领域">
              <select className="select" value={draft.domain} onChange={(e) => void patch({ domain: e.target.value })}>
                {['工作', '学习', '健康', '生活', '关系', '财务'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ height: 10 }} />
            <Field label="优先级">
              <select
                className="select"
                value={draft.quadrant}
                onChange={(e) => void patch({ quadrant: e.target.value as Task['quadrant'] })}
              >
                {Object.entries(QUADRANT_META).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label} · {v.hint}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ height: 10 }} />
            <Field label="截止日期">
              <input
                className="input"
                type="date"
                value={draft.due_date ?? ''}
                onChange={(e) => void patch({ due_date: e.target.value || null })}
              />
            </Field>
            <div style={{ height: 10 }} />
            <Field label="开始日期">
              <input
                className="input"
                type="date"
                value={draft.start_date ?? ''}
                onChange={(e) => void patch({ start_date: e.target.value || null })}
              />
            </Field>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">更新记录</h3>
            </div>
            <div className="kv">
              <span>创建</span>
              <b>{formatDateTime(draft.created_at)}</b>
            </div>
            <div className="kv">
              <span>最后更新</span>
              <b>{formatDateTime(draft.updated_at)}</b>
            </div>
            {draft.completed_at && (
              <div className="kv">
                <span>完成于</span>
                <b>{formatDateTime(draft.completed_at)}</b>
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && <TaskFormModal task={draft} onClose={() => setEditing(false)} />}
      {confirmDelete && (
        <Confirm
          title="删除任务"
          message={`确定删除「${draft.title}」吗？任务正文与附件会一并删除，且不可恢复。`}
          onConfirm={() => void remove()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}
