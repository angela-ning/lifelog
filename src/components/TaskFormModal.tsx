import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import * as repo from '../lib/repo'
import { uid } from '../lib/db'
import { today } from '../lib/date'
import {
  DOMAINS,
  QUADRANT_META,
  STATUS_META,
  type ChecklistItem,
  type Quadrant,
  type Task,
  type TaskStatus,
} from '../lib/types'
import { useApp } from '../store/app'
import { Field, Modal } from './ui'
import { TagPicker } from './TagPicker'

interface Props {
  task?: Task
  onClose: () => void
}

export function TaskFormModal({ task, onClose }: Props) {
  const { user, tags, reload, toast } = useApp()
  const [title, setTitle] = useState(task?.title ?? '')
  const [summary, setSummary] = useState(task?.summary ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [quadrant, setQuadrant] = useState<Quadrant>(task?.quadrant ?? 'q2')
  const [domain, setDomain] = useState(task?.domain ?? '生活')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [startDate, setStartDate] = useState(task?.start_date ?? today())
  const [estimate, setEstimate] = useState(task?.estimate_minutes ?? 0)
  const [tagIds, setTagIds] = useState<string[]>(task?.tag_ids ?? [])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task?.checklist ?? [])
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user) return
    if (!title.trim()) {
      toast('请填写任务标题', 'error')
      return
    }
    setSaving(true)
    try {
      const payload: Partial<Task> = {
        title,
        summary,
        status,
        quadrant,
        domain,
        due_date: dueDate || null,
        start_date: startDate || null,
        estimate_minutes: Number(estimate) || 0,
        tag_ids: tagIds,
        checklist,
      }
      if (task) await repo.updateTask(user.id, task.id, payload)
      else await repo.createTask(user.id, payload)
      await reload()
      toast(task ? '任务已更新' : '任务已创建', 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={task ? '编辑任务' : '新建任务'}
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      <Field label="标题">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="要完成的是什么？"
          autoFocus
        />
      </Field>

      <Field label="一句话摘要" hint="用「动词 + 结果」描述，例如：整理并归档 2026 上半年票据">
        <input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>

      <div className="grid cols-2">
        <Field label="优先级（艾森豪威尔四象限）" hint={QUADRANT_META[quadrant].hint}>
          <select className="select" value={quadrant} onChange={(e) => setQuadrant(e.target.value as Quadrant)}>
            {Object.entries(QUADRANT_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="状态">
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="所属领域">
          <select className="select" value={domain} onChange={(e) => setDomain(e.target.value)}>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Field label="预计投入（分钟）" hint="用于统计时间分配">
          <input
            className="input"
            type="number"
            min={0}
            value={estimate}
            onChange={(e) => setEstimate(Number(e.target.value))}
          />
        </Field>
        <Field label="开始日期">
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="截止日期">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <Field label="标签">
        <TagPicker
          tags={tags}
          selected={tagIds}
          onChange={setTagIds}
          onCreate={async (name, color) => {
            const tag = await repo.createTag(user!.id, name, color)
            await reload()
            setTagIds((prev) => [...prev, tag.id])
            return tag
          }}
        />
      </Field>

      <Field label="子清单" hint="有子清单时，进度按完成比例自动计算">
        <div className="col" style={{ gap: 4 }}>
          {checklist.map((item, idx) => (
            <div className="row" key={item.id}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  setChecklist((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, done: !x.done } : x)),
                  )
                }
              />
              <input
                className="input"
                value={item.text}
                onChange={(e) =>
                  setChecklist((prev) => prev.map((x, i) => (i === idx ? { ...x, text: e.target.value } : x)))
                }
                placeholder="下一步行动"
              />
              <button
                className="btn ghost sm"
                onClick={() => setChecklist((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            className="btn sm"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setChecklist((prev) => [...prev, { id: uid('ci_'), text: '', done: false }])}
          >
            <Plus size={13} /> 添加一项
          </button>
        </div>
      </Field>
    </Modal>
  )
}
