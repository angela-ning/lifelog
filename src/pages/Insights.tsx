import { useMemo } from 'react'
import { Activity, BarChart3, Clock, Heart, ListChecks, Target } from 'lucide-react'
import { useApp } from '../store/app'
import { addDays, eachDay, formatDate, today } from '../lib/date'
import { completionTrend, habitStats, moodTrend, overview } from '../lib/stats'
import { DOMAINS, QUADRANT_META } from '../lib/types'
import { Empty, ProgressBar, Stat } from '../components/ui'
import { Heatmap } from '../components/Heatmap'

export function Insights() {
  const { tasks, habits, checkins, journals } = useApp()
  const ref = today()
  const stats = useMemo(() => overview(tasks, habits, checkins, journals, ref), [tasks, habits, checkins, journals, ref])

  const trend = useMemo(() => completionTrend(tasks, 30, ref), [tasks, ref])
  const maxTrend = Math.max(1, ...trend.map((t) => t.value))
  const moods = useMemo(() => moodTrend(journals, 30, ref), [journals, ref])

  const byDomain = useMemo(() => {
    const map = new Map<string, number>()
    tasks
      .filter((t) => t.status !== 'archived')
      .forEach((t) => map.set(t.domain, (map.get(t.domain) ?? 0) + 1))
    return DOMAINS.map((d) => ({ domain: d, count: map.get(d) ?? 0 }))
  }, [tasks])

  const byQuadrant = useMemo(() => {
    const map = new Map<string, number>()
    tasks
      .filter((t) => t.status !== 'archived')
      .forEach((t) => map.set(t.quadrant, (map.get(t.quadrant) ?? 0) + 1))
    return map
  }, [tasks])

  const habitRanking = useMemo(
    () =>
      habits
        .filter((h) => !h.archived)
        .map((h) => ({ habit: h, st: habitStats(h, checkins, ref) }))
        .sort((a, b) => b.st.rate30 - a.st.rate30),
    [habits, checkins, ref],
  )

  const domainMax = Math.max(1, ...byDomain.map((d) => d.count))
  const quadrantTotal = Array.from(byQuadrant.values()).reduce((a, b) => a + b, 0)
  const activeDates = useMemo(() => {
    const set = new Set<string>()
    checkins.forEach((c) => set.add(c.date))
    journals.forEach((j) => set.add(j.date))
    tasks.filter((t) => t.completed_at).forEach((t) => set.add(t.completed_at!.slice(0, 10)))
    return Array.from(set)
  }, [checkins, journals, tasks])

  if (tasks.length === 0 && habits.length === 0 && journals.length === 0) {
    return <Empty emoji="📊" text="还没有足够的数据，先创建几个任务或打卡，图表会自己长出来。" />
  }

  return (
    <div className="col">
      <div className="grid cols-4">
        <Stat label="任务总数" value={tasks.filter((t) => t.status !== 'archived').length} icon={<ListChecks size={13} />} foot={`已完成 ${tasks.filter((t) => t.status === 'done').length} 项`} />
        <Stat label="本周完成" value={stats.doneThisWeek} icon={<BarChart3 size={13} />} color="var(--success)" foot={`本月 ${stats.doneThisMonth} 项`} />
        <Stat label="本周专注" value={`${stats.focusMinutesWeek} 分`} icon={<Clock size={13} />} foot="按完成任务记录的投入时长统计" />
        <Stat label="平均心情" value={stats.avgMood ? stats.avgMood.toFixed(1) : '—'} icon={<Heart size={13} />} color="var(--danger)" foot={`近 30 天记录 ${stats.journalCount30} 篇`} />
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">近 30 天完成趋势</h3>
            <div className="spacer" />
            <span className="muted small">共 {trend.reduce((s, t) => s + t.value, 0)} 项</span>
          </div>
          <div className="spark" style={{ height: 130 }}>
            {trend.map((p) => (
              <div
                key={p.date}
                className="spark-bar"
                style={{ height: `${Math.max(4, (p.value / maxTrend) * 100)}%`, background: p.value ? 'var(--primary)' : '#eef0f3' }}
                title={`${p.date}：${p.value} 项`}
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="muted small">{formatDate(addDays(ref, -29), 'month')}</span>
            <span className="muted small">今天</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">心情与精力曲线</h3>
            <div className="spacer" />
            <span className="muted small">空白表示当天没写日志</span>
          </div>
          <div className="row wrap" style={{ gap: 3, alignItems: 'flex-end' }}>
            {moods.map((m) => (
              <div
                key={m.date}
                title={`${m.date} 心情 ${m.mood || '—'}/5`}
                style={{
                  flex: '1 1 8px',
                  height: 8 + (m.mood || 0) * 14,
                  borderRadius: 4,
                  background: m.mood ? `hsl(${140 - (5 - m.mood) * 26}, 62%, 52%)` : '#eef0f3',
                }}
              />
            ))}
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <span className="muted small">{formatDate(addDays(ref, -29), 'month')}</span>
            <span className="muted small">今天</span>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">任务领域分布</h3>
            <div className="spacer" />
            <span className="muted small">看看时间花在哪些领域</span>
          </div>
          <div className="col" style={{ gap: 9 }}>
            {byDomain.map((d) => (
              <div key={d.domain}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className="small">{d.domain}</span>
                  <span className="muted small">{d.count}</span>
                </div>
                <div style={{ marginTop: 3 }}>
                  <ProgressBar value={(d.count / domainMax) * 100} slim />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">四象限分布</h3>
            <div className="spacer" />
            <span className="muted small">重要不紧急应占多数</span>
          </div>
          <div className="col" style={{ gap: 9 }}>
            {(Object.keys(QUADRANT_META) as (keyof typeof QUADRANT_META)[]).map((k) => {
              const count = byQuadrant.get(k) ?? 0
              const pct = quadrantTotal ? (count / quadrantTotal) * 100 : 0
              return (
                <div key={k}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="small" style={{ color: QUADRANT_META[k].color }}>
                      {QUADRANT_META[k].label}
                    </span>
                    <span className="muted small">
                      {count} 项 · {Math.round(pct)}%
                    </span>
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <ProgressBar value={pct} slim color={QUADRANT_META[k].color} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">打卡完成率排行</h3>
            <div className="spacer" />
            <span className="muted small">近 30 天</span>
          </div>
          {habitRanking.length === 0 ? (
            <p className="muted small">还没有打卡任务。</p>
          ) : (
            <div className="col" style={{ gap: 10 }}>
              {habitRanking.map(({ habit, st }) => (
                <div key={habit.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="small">
                      {habit.emoji} {habit.name}
                    </span>
                    <span className="muted small">
                      {st.rate30}% · 连续 {st.streak} 天
                    </span>
                  </div>
                  <div style={{ marginTop: 3 }}>
                    <ProgressBar value={st.rate30} slim color={habit.color} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">活跃日历</h3>
            <div className="spacer" />
            <span className="muted small">
              <Activity size={12} style={{ verticalAlign: -2 }} /> 有记录的日子
            </span>
          </div>
          <Heatmap dates={activeDates} weeks={20} />
          <p className="muted small" style={{ marginTop: 10 }}>
            连续 {stats.journalStreak} 天有记录；近 30 天活跃 {eachDay(addDays(ref, -29), ref).filter((d) => activeDates.includes(d)).length} 天。
          </p>
        </div>
      </div>
    </div>
  )
}
