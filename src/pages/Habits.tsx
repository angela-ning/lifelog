import { useMemo, useState } from 'react'
import { Archive, Flame, Pencil, Plus, Target, Trash2 } from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import { formatDate, today } from '../lib/date'
import { CYCLE_META, type Habit } from '../lib/types'
import { habitStats, isScheduledDay } from '../lib/stats'
import { Confirm, Empty, ProgressBar, Ring, Stat } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import { HabitFormModal } from '../components/HabitFormModal'

export function Habits() {
  const { user, habits, checkins, reload, toast } = useApp()
  const ref = today()
  const [editing, setEditing] = useState<Habit | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Habit | null>(null)

  const active = habits.filter((h) => !h.archived)
  const archived = habits.filter((h) => h.archived)

  const todayRate = useMemo(() => {
    const scheduled = active.filter((h) => isScheduledDay(h, ref))
    if (!scheduled.length) return 100
    const done = scheduled.filter((h) => checkins.some((c) => c.habit_id === h.id && c.date === ref))
    return Math.round((done.length / scheduled.length) * 100)
  }, [active, checkins, ref])

  const weekRate = useMemo(() => {
    if (!active.length) return 0
    const sum = active.reduce((acc, h) => acc + habitStats(h, checkins, ref).percent, 0)
    return Math.round(sum / active.length)
  }, [active, checkins, ref])

  const bestStreak = useMemo(() => {
    if (!active.length) return 0
    return Math.max(...active.map((h) => habitStats(h, checkins, ref).streak))
  }, [active, checkins, ref])

  async function toggle(habitId: string) {
    if (!user) return
    const res = await repo.toggleCheckin(user.id, habitId, ref)
    await reload()
    toast(res ? '打卡成功' : '已取消今日打卡', res ? 'success' : 'info')
  }

  return (
    <>
      <div className="grid cols-3">
        <Stat label="今日完成率" value={`${todayRate}%`} icon={<Target size={13} />} foot={`${active.length} 个进行中的打卡`} />
        <Stat label="周期平均进度" value={`${weekRate}%`} icon={<Target size={13} />} foot="各打卡当前周期的平均值" />
        <Stat label="最长连续" value={`${bestStreak} 天`} icon={<Flame size={13} />} color="var(--warn)" foot="习惯养成中位数约 66 天" />
      </div>

      <div className="row" style={{ margin: '14px 0 10px' }}>
        <button className="btn primary" onClick={() => setCreating(true)}>
          <Plus size={14} /> 新建打卡
        </button>
        <div style={{ flex: 1 }} />
        <span className="muted small">{formatDate(ref, 'long')}</span>
      </div>

      {active.length === 0 ? (
        <Empty
          emoji="🔁"
          text="还没有打卡任务。建议从「小到不会失败」开始，比如每天读 2 页。"
          action={
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> 新建打卡
            </button>
          }
        />
      ) : (
        <div className="grid cols-2">
          {active.map((habit) => {
            const st = habitStats(habit, checkins, ref)
            const dates = checkins.filter((c) => c.habit_id === habit.id).map((c) => c.date)
            return (
              <div className={`habit-card${st.todayDone ? '' : ' pending'}`} key={habit.id}>
                <div className="habit-head">
                  <div className="habit-emoji" style={{ background: `${habit.color}1f` }}>
                    {habit.emoji}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="habit-name">{habit.name}</div>
                    <div className="muted small">
                      {CYCLE_META[habit.cycle_type].label} · {habit.description || '无说明'}
                    </div>
                  </div>
                  <button className="btn ghost sm" onClick={() => setEditing(habit)}>
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={async () => {
                      await repo.updateHabit(user!.id, habit.id, { archived: true })
                      await reload()
                    }}
                    title="归档"
                  >
                    <Archive size={13} />
                  </button>
                </div>

                <div className="row" style={{ gap: 12 }}>
                  <Ring percent={st.percent} size={56} stroke={6} color={habit.color}>
                    <span style={{ fontSize: 11 }}>{st.percent}%</span>
                  </Ring>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="small">{st.period.label}进度</span>
                      <span className="muted small">
                        {st.doneInPeriod}/{st.period.target} 次
                      </span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <ProgressBar value={st.percent} color={habit.color} />
                    </div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
                      <span className="streak-pill">
                        <Flame size={11} /> 连续 {st.streak} 天
                      </span>
                      <span className="badge">累计 {st.total} 次</span>
                      <span className="badge">近 30 天 {st.rate30}%</span>
                    </div>
                  </div>
                </div>

                <div className="milestone">
                  {[7, 21, 66, 100].map((d) => (
                    <span key={d} className={st.bestStreak >= d ? 'reached' : ''}>
                      {d} 天里程碑{st.bestStreak >= d ? ' ✓' : ''}
                    </span>
                  ))}
                </div>

                <Heatmap dates={dates} weeks={12} color={habit.color} />

                <button
                  className={`check-btn${st.todayDone ? ' done' : ''}`}
                  onClick={() => void toggle(habit.id)}
                  disabled={!isScheduledDay(habit, ref)}
                >
                  {!isScheduledDay(habit, ref)
                    ? '今天不在计划内'
                    : st.todayDone
                      ? `今日已打卡 ✓`
                      : '完成今日打卡'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-head">
            <h3 className="card-title">已归档</h3>
          </div>
          <div className="col" style={{ gap: 8 }}>
            {archived.map((h) => (
              <div className="row" key={h.id}>
                <span>{h.emoji}</span>
                <span style={{ flex: 1 }}>{h.name}</span>
                <button
                  className="btn sm"
                  onClick={async () => {
                    await repo.updateHabit(user!.id, h.id, { archived: false })
                    await reload()
                  }}
                >
                  恢复
                </button>
                <button className="btn ghost sm" onClick={() => setDeleting(h)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {creating && <HabitFormModal onClose={() => setCreating(false)} />}
      {editing && <HabitFormModal habit={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Confirm
          title="删除打卡"
          message={`删除「${deleting.name}」会同时删除它的全部打卡记录，且不可恢复。`}
          onConfirm={async () => {
            await repo.deleteHabit(user!.id, deleting.id)
            await reload()
            setDeleting(null)
            toast('已删除', 'success')
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
