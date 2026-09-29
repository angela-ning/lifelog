import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  ListChecks,
  Plus,
  Target,
} from 'lucide-react'
import { useApp } from '../store/app'
import { addDays, diffDays, formatDate, relativeDay, today } from '../lib/date'
import { completionTrend, habitStats, isScheduledDay, overview } from '../lib/stats'
import { ProgressBar, Ring, Stat } from '../components/ui'
import { Heatmap } from '../components/Heatmap'
import { TaskFormModal } from '../components/TaskFormModal'
import { useState } from 'react'
import * as repo from '../lib/repo'
import type { Task } from '../lib/types'

export function Dashboard() {
  const { user, tasks, habits, checkins, journals, reload } = useApp()
  const nav = useNavigate()
  const [creating, setCreating] = useState(false)
  const ref = today()

  const stats = useMemo(
    () => overview(tasks, habits, checkins, journals, ref),
    [tasks, habits, checkins, journals, ref],
  )

  const todayTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'done' && t.status !== 'archived')
    return active
      .filter((t) => t.due_date && diffDays(ref, t.due_date) <= 3)
      .sort((a, b) => (a.due_date ?? '') < (b.due_date ?? '') ? -1 : 1)
  }, [tasks, ref])

  const todayHabits = useMemo(() => {
    return habits
      .filter((h) => !h.archived && isScheduledDay(h, ref))
      .map((h) => ({ habit: h, st: habitStats(h, checkins, ref) }))
  }, [habits, checkins, ref])

  const trend = useMemo(() => completionTrend(tasks, 14, ref), [tasks, ref])
  const maxTrend = Math.max(1, ...trend.map((t) => t.value))

  const activeDates = useMemo(() => {
    const set = new Set<string>()
    checkins.forEach((c) => set.add(c.date))
    journals.forEach((j) => set.add(j.date))
    tasks.filter((t) => t.completed_at).forEach((t) => set.add(t.completed_at!.slice(0, 10)))
    return Array.from(set)
  }, [checkins, journals, tasks])

  const todayJournal = journals.find((j) => j.date === ref)
  const recent = tasks.filter((t) => t.status !== 'archived').slice(0, 4)

  async function toggleDone(task: Task) {
    if (!user) return
    await repo.updateTask(user.id, task.id, {
      status: task.status === 'done' ? 'doing' : 'done',
    })
    await reload()
  }

  async function quickCheckin(habitId: string) {
    if (!user) return
    await repo.toggleCheckin(user.id, habitId, ref)
    await reload()
  }

  return (
    <>
      <div className="grid cols-4">
        <Stat
          label="进行中 / 待办"
          value={`${stats.doingTasks} / ${stats.todoTasks}`}
          foot={`${stats.overdue} 项已逾期 · ${stats.dueSoon} 项 3 天内到期`}
          icon={<ListChecks size={13} />}
        />
        <Stat
          label="今日待打卡"
          value={stats.habitsPendingToday}
          foot={`共 ${stats.habitsTotal} 个打卡任务`}
          icon={<Target size={13} />}
          color={stats.habitsPendingToday ? 'var(--warn)' : 'var(--success)'}
        />
        <Stat
          label="本周完成"
          value={stats.doneThisWeek}
          foot={`本月累计 ${stats.doneThisMonth} 项`}
          icon={<CheckCircle2 size={13} />}
          color="var(--success)"
        />
        <Stat
          label="记录连续天数"
          value={stats.journalStreak}
          foot={`近 30 天写了 ${stats.journalCount30} 篇`}
          icon={<Flame size={13} />}
          color="var(--warn)"
        />
      </div>

      <div className="grid cols-2" style={{ marginTop: 14, alignItems: 'start' }}>
        <div className="col">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">今日聚焦</h3>
              <div className="spacer" />
              <button className="btn sm" onClick={() => setCreating(true)}>
                <Plus size={13} /> 新建任务
              </button>
            </div>
            {todayTasks.length === 0 ? (
              <p className="muted small">近期没有到期任务，去看看全部任务或给重要的事设个截止日。</p>
            ) : (
              <div className="col" style={{ gap: 8 }}>
                {todayTasks.slice(0, 6).map((t) => {
                  const overdue = !!t.due_date && t.due_date < ref
                  return (
                    <div className="task-row" key={t.id} onClick={() => nav(`/tasks/${t.id}`)}>
                      <button
                        className={`task-check${t.status === 'done' ? ' done' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggleDone(t)
                        }}
                      >
                        {t.status === 'done' && <CheckCircle2 size={14} />}
                      </button>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="title">{t.title}</p>
                        <div className="row wrap" style={{ gap: 6 }}>
                          <span
                            className="badge"
                            style={{
                              color: overdue ? 'var(--danger)' : 'var(--text-2)',
                              background: overdue ? 'var(--danger-soft)' : undefined,
                            }}
                          >
                            <AlertCircle size={11} />
                            {t.due_date ? `${relativeDay(t.due_date)} · ${formatDate(t.due_date, 'month')}` : '无截止日'}
                          </span>
                          <span className="badge">{t.domain}</span>
                        </div>
                      </div>
                      <span className="muted small">{t.progress}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">今日打卡</h3>
              <div className="spacer" />
              <span className="muted small">完成率 {stats.habitRateToday}%</span>
            </div>
            {todayHabits.length === 0 ? (
              <p className="muted small">今天没有安排打卡，去「打卡」页创建第一个习惯吧。</p>
            ) : (
              <div className="col" style={{ gap: 10 }}>
                {todayHabits.map(({ habit, st }) => (
                  <div className="row" key={habit.id} style={{ gap: 12 }}>
                    <div
                      className="habit-emoji"
                      style={{ background: `${habit.color}1a`, width: 30, height: 30, flex: '0 0 30px' }}
                    >
                      {habit.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="habit-name">{habit.name}</div>
                      <div className="muted small">
                        {st.period.label} {st.doneInPeriod}/{st.period.target} · 连续 {st.streak} 天
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <ProgressBar value={st.percent} color={habit.color} slim />
                      </div>
                    </div>
                    <button
                      className={`check-btn${st.todayDone ? ' done' : ''}`}
                      style={{ width: 84 }}
                      onClick={() => void quickCheckin(habit.id)}
                    >
                      {st.todayDone ? '已打卡' : '打卡'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col">
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">今天的记录</h3>
              <div className="spacer" />
              <button className="btn sm" onClick={() => nav('/journal')}>
                <BookOpen size={13} /> {todayJournal ? '继续写' : '写一篇'}
              </button>
            </div>
            {todayJournal ? (
              <>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{todayJournal.title || '无标题'}</strong>
                  <span className="badge">心情 {todayJournal.mood}/5 · 精力 {todayJournal.energy}/5</span>
                </div>
                <p className="muted small" style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                  {todayJournal.content_md.slice(0, 160) || '（还没有正文）'}
                </p>
              </>
            ) : (
              <p className="muted small">
                今天还没有记录。哪怕只写一句「今天最在意的一件事」，也是给未来的自己留线索。
              </p>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">近 14 天完成趋势</h3>
              <div className="spacer" />
              <span className="muted small">共 {trend.reduce((s, t) => s + t.value, 0)} 项</span>
            </div>
            <div className="spark">
              {trend.map((p) => (
                <div
                  key={p.date}
                  className="spark-bar"
                  style={{ height: `${Math.max(4, (p.value / maxTrend) * 100)}%`, background: p.value ? 'var(--primary)' : '#eef0f3' }}
                  title={`${p.date} 完成 ${p.value} 项`}
                >
                  {p.value > 0 && <i>{p.value}</i>}
                </div>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
              <span className="muted small">{formatDate(addDays(ref, -13), 'month')}</span>
              <span className="muted small">今天</span>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">活跃日历</h3>
              <div className="spacer" />
              <span className="muted small">打卡 / 日志 / 完成任务</span>
            </div>
            <Heatmap dates={activeDates} weeks={18} />
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="card-title">最近任务</h3>
              <div className="spacer" />
              <button className="btn ghost sm" onClick={() => nav('/tasks')}>
                全部 <ArrowRight size={13} />
              </button>
            </div>
            {recent.length === 0 ? (
              <p className="muted small">还没有任务，从一件「重要不紧急」的事开始。</p>
            ) : (
              <div className="col" style={{ gap: 8 }}>
                {recent.map((t) => (
                  <div className="row" key={t.id} style={{ gap: 10, cursor: 'pointer' }} onClick={() => nav(`/tasks/${t.id}`)}>
                    <Ring percent={t.progress} size={38} stroke={5}>
                      <span style={{ fontSize: 9 }}>{t.progress}%</span>
                    </Ring>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div className="muted small">{t.summary || t.domain}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {creating && <TaskFormModal onClose={() => setCreating(false)} />}
    </>
  )
}
