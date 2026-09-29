import { useMemo, useState } from 'react'
import { CalendarClock, Save, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import {
  addDays,
  diffDays,
  eachDay,
  endOfMonth,
  endOfWeek,
  formatDate,
  monthKey,
  quarterKey,
  startOfMonth,
  startOfWeek,
  today,
  weekKey,
} from '../lib/date'
import { isScheduledDay } from '../lib/stats'
import type { PeriodType, Review } from '../lib/types'
import { Empty, Field, Segmented } from '../components/ui'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { MarkdownView } from '../components/MarkdownView'

export function Reviews() {
  const { user, tasks, habits, checkins, journals, reviews, reload, toast } = useApp()
  const ref = today()
  const [periodType, setPeriodType] = useState<PeriodType>('week')
  const [periodKey, setPeriodKey] = useState(() => (periodType === 'week' ? weekKey(ref) : monthKey(ref)))

  const range = useMemo(() => {
    if (periodType === 'week') {
      // 从 periodKey 解析不出日期时退回本周
      const base = ref
      return { start: startOfWeek(base), end: endOfWeek(base) }
    }
    if (periodType === 'month') return { start: startOfMonth(ref), end: endOfMonth(ref) }
    return { start: startOfMonth(ref), end: endOfMonth(ref) }
  }, [periodType, ref])

  const currentKey = periodType === 'week' ? weekKey(ref) : periodType === 'month' ? monthKey(ref) : quarterKey(ref)
  const activeKey = periodKey || currentKey

  const summary = useMemo(() => {
    const inRange = (d: string) => d >= range.start && d <= range.end
    const done = tasks.filter((t) => t.completed_at && inRange(t.completed_at.slice(0, 10)))
    const minutes = done.reduce((s, t) => s + (t.spent_minutes || 0), 0)
    const activeHabits = habits.filter((h) => !h.archived)
    const scheduledDays = activeHabits.reduce(
      (sum, h) => sum + eachDay(range.start, range.end).filter((d) => isScheduledDay(h, d)).length,
      0,
    )
    const doneCheckins = checkins.filter((c) => inRange(c.date)).length
    const periodJournals = journals.filter((j) => inRange(j.date))
    const moods = periodJournals.filter((j) => j.mood > 0).map((j) => j.mood)
    const avgMood = moods.length ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '—'
    return {
      doneCount: done.length,
      minutes,
      checkinRate: scheduledDays ? Math.round((doneCheckins / scheduledDays) * 100) : 0,
      journalCount: periodJournals.length,
      avgMood,
      span: diffDays(range.start, range.end) + 1,
    }
  }, [tasks, habits, checkins, journals, range])

  const existing = reviews.find((r) => r.period_type === periodType && r.period_key === activeKey) ?? null
  const [content, setContent] = useState(existing?.content_md ?? '')
  const [score, setScore] = useState(existing?.score ?? 7)

  function applyTemplate() {
    const md = `## 一、数据回顾

- 完成任务：**${summary.doneCount}** 项，累计专注 ${summary.minutes} 分钟
- 打卡完成率：**${summary.checkinRate}%**
- 日志：${summary.journalCount} 篇，平均心情 ${summary.avgMood}/5

## 二、做得好的三件事

1. 
2. 
3. 

## 三、卡住或没做到的

1. 
2. 

## 四、下个周期最重要的三件事

1. 
2. 
3. 

## 五、给自己一句话

`
    setContent((prev) => (prev.trim() ? prev : md))
    return md
  }

  async function save() {
    if (!user) return
    await repo.upsertReview(user.id, {
      period_type: periodType,
      period_key: activeKey,
      title:
        periodType === 'week'
          ? `${activeKey} 周复盘（${formatDate(range.start, 'month')} - ${formatDate(range.end, 'month')}）`
          : `${activeKey} 月复盘`,
      content_md: content,
      score,
    })
    await reload()
    toast('复盘已保存', 'success')
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 300px', alignItems: 'start' }}>
      <div className="col">
        <div className="card">
          <div className="row wrap" style={{ gap: 10 }}>
            <Segmented
              value={periodType}
              onChange={(v) => {
                setPeriodType(v)
                setPeriodKey(v === 'week' ? weekKey(ref) : v === 'month' ? monthKey(ref) : quarterKey(ref))
                setContent('')
              }}
              options={[
                { value: 'week', label: '周复盘' },
                { value: 'month', label: '月复盘' },
                { value: 'quarter', label: '季度复盘' },
              ]}
            />
            <span className="badge">
              <CalendarClock size={12} /> {activeKey}
            </span>
            <span className="muted small">
              {formatDate(range.start, 'month')} - {formatDate(range.end, 'month')}（共 {summary.span} 天）
            </span>
            <div style={{ flex: 1 }} />
            <button className="btn sm" onClick={() => setContent(applyTemplate())}>
              <Sparkles size={13} /> 用数据生成模板
            </button>
            <button className="btn primary sm" onClick={() => void save()}>
              <Save size={13} /> 保存复盘
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">复盘内容</h3>
            <div className="spacer" />
            <span className="muted small">自评分</span>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <b style={{ width: 22, textAlign: 'right' }}>{score}</b>
          </div>
          <MarkdownEditor value={content} onChange={setContent} minRows={18} />
        </div>

        {content && (
          <div className="card">
            <div className="card-head">
              <h3 className="card-title">预览</h3>
            </div>
            <MarkdownView content={content} />
          </div>
        )}
      </div>

      <div className="col">
        <div className="card">
          <div className="card-head">
            <h3 className="card-title">本周期数据</h3>
          </div>
          <div className="kv">
            <span>完成任务</span>
            <b>{summary.doneCount} 项</b>
          </div>
          <div className="kv">
            <span>专注时长</span>
            <b>{summary.minutes} 分钟</b>
          </div>
          <div className="kv">
            <span>打卡完成率</span>
            <b>{summary.checkinRate}%</b>
          </div>
          <div className="kv">
            <span>日志篇数</span>
            <b>{summary.journalCount}</b>
          </div>
          <div className="kv">
            <span>平均心情</span>
            <b>{summary.avgMood}/5</b>
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>
            数据来源：任务完成时间、打卡记录与日志心情评分，全部自动统计。
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <h3 className="card-title">历史复盘</h3>
            <div className="spacer" />
            <span className="muted small">{reviews.length} 篇</span>
          </div>
          {reviews.length === 0 ? (
            <p className="muted small">还没有复盘记录。</p>
          ) : (
            <div className="col" style={{ gap: 8 }}>
              {reviews.map((r: Review) => (
                <div className="row" key={r.id}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.title}</div>
                    <div className="muted small">自评分 {r.score}/10</div>
                  </div>
                  <button
                    className="btn sm"
                    onClick={() => {
                      setPeriodType(r.period_type)
                      setPeriodKey(r.period_key)
                      setContent(r.content_md)
                      setScore(r.score)
                    }}
                  >
                    打开
                  </button>
                  <button
                    className="btn ghost sm"
                    onClick={async () => {
                      await repo.deleteReview(user!.id, r.id)
                      await reload()
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {!content && (
          <Empty emoji="🪞" text="复盘是把经历变成经验的一步：先看看数据，再写下三件做得好的事。" />
        )}
      </div>
    </div>
  )
}
