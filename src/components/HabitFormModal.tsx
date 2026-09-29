import { useState } from 'react'
import * as repo from '../lib/repo'
import { today, weekdayShort } from '../lib/date'
import { CYCLE_META, TAG_COLORS, type CycleType, type Habit } from '../lib/types'
import { useApp } from '../store/app'
import { Field, Modal } from './ui'

const EMOJIS = ['✅', '📚', '🏃', '💧', '🧘', '🌙', '✍️', '🥗', '🎸', '🧹', '💊', '🧠']

interface Props {
  habit?: Habit
  onClose: () => void
}

export function HabitFormModal({ habit, onClose }: Props) {
  const { user, reload, toast } = useApp()
  const [name, setName] = useState(habit?.name ?? '')
  const [description, setDescription] = useState(habit?.description ?? '')
  const [emoji, setEmoji] = useState(habit?.emoji ?? '✅')
  const [color, setColor] = useState(habit?.color ?? '#4f46e5')
  const [cycleType, setCycleType] = useState<CycleType>(habit?.cycle_type ?? 'daily')
  const [target, setTarget] = useState(habit?.cycle_target ?? 1)
  const [weekdays, setWeekdays] = useState<number[]>(habit?.weekdays ?? [1, 2, 3, 4, 5])
  const [intervalDays, setIntervalDays] = useState(habit?.interval_days ?? 2)
  const [startDate, setStartDate] = useState(habit?.start_date ?? today())
  const [endDate, setEndDate] = useState(habit?.end_date ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!user) return
    if (!name.trim()) {
      toast('请填写打卡名称', 'error')
      return
    }
    setSaving(true)
    try {
      const payload: Partial<Habit> = {
        name,
        description,
        emoji,
        color,
        cycle_type: cycleType,
        cycle_target: cycleType === 'weekdays' ? weekdays.length : Math.max(1, target),
        weekdays,
        interval_days: Math.max(1, intervalDays),
        start_date: startDate,
        end_date: endDate || null,
      }
      if (habit) await repo.updateHabit(user.id, habit.id, payload)
      else await repo.createHabit(user.id, payload)
      await reload()
      toast(habit ? '打卡任务已更新' : '打卡任务已创建', 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={habit ? '编辑打卡' : '新建打卡任务'}
      onClose={onClose}
      width={580}
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
      <Field label="名称">
        <input
          className="input"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：每天读 20 页 / 每周跑步 3 次"
        />
      </Field>

      <Field label="说明" hint="写清楚「最小可执行版本」，越小越容易坚持">
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div className="grid cols-2">
        <Field label="图标">
          <div className="row wrap" style={{ gap: 4 }}>
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: emoji === e ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </Field>
        <Field label="颜色">
          <div className="row wrap" style={{ gap: 5 }}>
            {TAG_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '2px solid #1f2430' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </Field>
      </div>

      <Field label="打卡周期" hint={CYCLE_META[cycleType].hint}>
        <select className="select" value={cycleType} onChange={(e) => setCycleType(e.target.value as CycleType)}>
          {Object.entries(CYCLE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
      </Field>

      {cycleType === 'weekdays' && (
        <Field label="选择星期">
          <div className="row wrap" style={{ gap: 4 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <button
                type="button"
                key={d}
                className={`tag${weekdays.includes(d) ? ' active' : ''}`}
                style={weekdays.includes(d) ? { color: 'var(--primary)' } : undefined}
                onClick={() =>
                  setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
                }
              >
                {weekdayShort(d)}
              </button>
            ))}
          </div>
        </Field>
      )}

      {(cycleType === 'weekly' || cycleType === 'monthly' || cycleType === 'daily') && (
        <Field label={cycleType === 'daily' ? '每天打卡次数' : '每个周期目标次数'}>
          <input
            className="input"
            type="number"
            min={1}
            max={60}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </Field>
      )}

      {cycleType === 'interval' && (
        <Field label="间隔天数">
          <input
            className="input"
            type="number"
            min={1}
            max={90}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
          />
        </Field>
      )}

      <div className="grid cols-2">
        <Field label="开始日期">
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="结束日期（可留空）">
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
