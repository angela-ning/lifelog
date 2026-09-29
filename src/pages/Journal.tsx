import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarDays, Save, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import { formatDate, today, weekdayLabel } from '../lib/date'
import type { Journal } from '../lib/types'
import { Confirm, Empty, Field } from '../components/ui'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { AttachmentPanel } from '../components/AttachmentPanel'
import { TagPicker } from '../components/TagPicker'

const TEMPLATES: { name: string; body: string }[] = [
  {
    name: '三件好事',
    body: `\n## 今天的三件好事\n\n1. \n2. \n3. \n\n## 为什么它们会发生\n\n`,
  },
  {
    name: '今日复盘',
    body: `\n## 今天做了什么\n\n## 哪里卡住了\n\n## 明天最重要的一件事\n\n`,
  },
  {
    name: '情绪记录',
    body: `\n## 此刻的感受\n\n## 触发这件事的原因\n\n## 我可以做的一件小事\n\n`,
  },
]

const MOODS = ['😞', '🙁', '😐', '🙂', '😄']

export function Journal() {
  const { user, journals, tags, reload, toast } = useApp()
  const [date, setDate] = useState(today())
  const [draft, setDraft] = useState<Partial<Journal> | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const existing = useMemo(() => journals.find((j) => j.date === date) ?? null, [journals, date])

  useEffect(() => {
    if (existing) setDraft(existing)
    else setDraft({ date, title: '', content_md: '', mood: 3, energy: 3, weather: '', location: '', tag_ids: [] })
  }, [existing, date])

  if (!user || !draft) return null

  async function save() {
    const saved = await repo.upsertJournal(user!.id, { ...draft, date })
    setDraft(saved)
    await reload()
    toast('已保存', 'success')
  }

  const recent = journals.slice(0, 20)

  return (
    <div className="grid" style={{ gridTemplateColumns: '280px minmax(0, 1fr)', alignItems: 'start' }}>
      <div className="col">
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">
              <CalendarDays size={14} style={{ verticalAlign: -2 }} /> 选择日期
            </h3>
          </div>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <p className="muted small" style={{ marginTop: 8 }}>
            {weekdayLabel(date)} · {existing ? '这天已有记录' : '这天还没有记录'}
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">
              <BookOpen size={14} style={{ verticalAlign: -2 }} /> 最近记录
            </h3>
            <div className="spacer" />
            <span className="muted small">{journals.length} 篇</span>
          </div>
          {recent.length === 0 ? (
            <p className="muted small">还没有任何记录。</p>
          ) : (
            <div className="col" style={{ gap: 6 }}>
              {recent.map((j) => (
                <button
                  key={j.id}
                  className={`nav-item${j.date === date ? ' active' : ''}`}
                  onClick={() => setDate(j.date)}
                >
                  <span>{MOODS[(j.mood || 3) - 1]}</span>
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatDate(j.date, 'month')} {j.title || '无标题'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="col">
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 className="card-title">
              {formatDate(date, 'long')} · {weekdayLabel(date)}
            </h3>
            <div className="row">
              {existing && (
                <button className="btn danger sm" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={13} /> 删除
                </button>
              )}
              <button className="btn primary sm" onClick={() => void save()}>
                <Save size={13} /> 保存
              </button>
            </div>
          </div>

          <div style={{ height: 12 }} />

          <Field label="标题">
            <input
              className="input"
              value={draft.title ?? ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="给这一天一个标题"
            />
          </Field>

          <div className="grid cols-3">
            <Field label={`心情 ${draft.mood ?? 3}/5`}>
              <div className="row" style={{ gap: 4 }}>
                {MOODS.map((m, i) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setDraft({ ...draft, mood: i + 1 })}
                    style={{
                      fontSize: 17,
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      border: draft.mood === i + 1 ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </Field>
            <Field label={`精力 ${draft.energy ?? 3}/5`}>
              <input
                type="range"
                min={1}
                max={5}
                value={draft.energy ?? 3}
                onChange={(e) => setDraft({ ...draft, energy: Number(e.target.value) })}
                style={{ width: '100%' }}
              />
            </Field>
            <div className="grid cols-2" style={{ gap: 8 }}>
              <Field label="天气">
                <input
                  className="input"
                  value={draft.weather ?? ''}
                  onChange={(e) => setDraft({ ...draft, weather: e.target.value })}
                  placeholder="晴"
                />
              </Field>
              <Field label="地点">
                <input
                  className="input"
                  value={draft.location ?? ''}
                  onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                  placeholder="在家"
                />
              </Field>
            </div>
          </div>

          <Field label="标签">
            <TagPicker
              tags={tags}
              selected={draft.tag_ids ?? []}
              onChange={(ids) => setDraft({ ...draft, tag_ids: ids })}
              onCreate={async (name, color) => {
                const tag = await repo.createTag(user!.id, name, color)
                await reload()
                return tag
              }}
            />
          </Field>

          <Field label="正文（Markdown）">
            <div className="row wrap" style={{ gap: 6, marginBottom: 6 }}>
              <span className="muted small">
                <Sparkles size={12} style={{ verticalAlign: -2 }} /> 快速模板：
              </span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  className="btn sm"
                  onClick={() => setDraft({ ...draft, content_md: (draft.content_md ?? '') + t.body })}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <MarkdownEditor
              value={draft.content_md ?? ''}
              onChange={(v) => setDraft({ ...draft, content_md: v })}
              minRows={16}
            />
          </Field>
        </div>

        {existing ? (
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">当天的照片与附件</h3>
              <div className="spacer" />
              <span className="muted small">支持图片、PDF、Word、Markdown</span>
            </div>
            <AttachmentPanel
              ownerId={user.id}
              refType="journal"
              refId={existing.id}
              onInsert={(md) => {
                setDraft({ ...draft, content_md: (draft.content_md ?? '') + `\n${md}\n` })
                toast('已插入正文，记得保存', 'success')
              }}
            />
          </div>
        ) : (
          <Empty emoji="📝" text="先保存这篇日志，就可以为它添加照片和附件了" />
        )}
      </div>

      {confirmDelete && existing && (
        <Confirm
          title="删除日志"
          message={`确定删除 ${formatDate(existing.date)} 的记录吗？相关附件也会一并删除。`}
          onConfirm={async () => {
            await repo.deleteJournal(user!.id, existing.id)
            await reload()
            setConfirmDelete(false)
            toast('已删除', 'success')
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
