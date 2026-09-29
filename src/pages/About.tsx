import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Database,
  Lightbulb,
  Repeat,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../store/app'
import { formatDateTime } from '../lib/date'

const SECTIONS = [
  {
    icon: <CheckSquare size={16} />,
    title: '任务：从「想法」到「下一步行动」',
    basis: 'GTD（Getting Things Done）',
    desc: '大脑擅长产生想法，不擅长保存想法。把每件事落成一条可执行的「下一步行动」，能显著降低心理负担。任务默认拆出子清单，进度由清单完成比例自动计算。',
  },
  {
    icon: <Target />,
    title: '优先级：艾森豪威尔四象限',
    basis: '重要 / 紧急 二维划分',
    desc: '多数时间被「紧急」牵着走，真正有价值的是「重要不紧急」：学习、健康、关系。四象限视图会告诉你，你的任务到底堆在哪个格子里。',
  },
  {
    icon: <Repeat size={16} />,
    title: '打卡：小到不会失败 + 不断链',
    basis: 'Fogg 行为模型 · Lally 等（2010）习惯形成研究',
    desc: '习惯自动化平均需要约 66 天（区间 18–254 天），所以站点内设了 7 / 21 / 66 / 100 天里程碑，而不是只盯着「坚持 21 天」。单个打卡支持每天、指定星期、每周 N 次、每月 N 次和每 N 天五种周期，进度条显示当前周期的完成度，连续天数独立统计。',
  },
  {
    icon: <BookOpen size={16} />,
    title: '生活日志：记录本身就是整理',
    basis: '表达性写作 · 积极心理学「三件好事」练习',
    desc: '把感受写下来有助于降低反复反刍。日志内置心情与精力 1–5 分评分、天气地点，以及「三件好事」「今日复盘」「情绪记录」模板，写不出来的时候从模板开始。',
  },
  {
    icon: <CalendarClock size={16} />,
    title: '复盘：没有复盘，经历只是经过',
    basis: 'GTD 周回顾 · PDCA 循环',
    desc: '复盘页会自动汇总该周期的任务完成数、专注时长、打卡完成率、日志篇数与平均心情，再让你回答「做得好的 / 卡住的 / 下一步」。数据负责事实，你负责判断。',
  },
  {
    icon: <BarChart3 size={16} />,
    title: '洞察：量化自我',
    basis: 'Quantified Self',
    desc: '完成趋势、心情曲线、领域分布、四象限结构与打卡排行，都是为了回答一个问题：我的时间到底流向了哪里。',
  },
]

function Target() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" />
    </svg>
  )
}

export function About() {
  const { user, tasks, habits, journals } = useApp()

  return (
    <div className="col">
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 8 }}>
          <Lightbulb size={15} style={{ verticalAlign: -2 }} /> 这是一个什么样的站点
        </h3>
        <p style={{ margin: '0 0 8px', color: 'var(--text-2)' }}>
          生活记录是一个给自己用的私人档案：既能管住「要做的事」，也能留住「活过的日子」。
          它不是效率工具竞赛，而是把任务、习惯、日志、复盘放在同一个时间轴上——你做过的、坚持过的、想过的事，最后都能被回看。
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          设计原则：一件事只记录一次；能自动算的绝不手动填；所有输入都以 Markdown 保存，随时可导出成纯文本。
        </p>
      </div>

      <div className="grid cols-2">
        {SECTIONS.map((s) => (
          <div className="card" key={s.title}>
            <div className="card-head">
              <span style={{ color: 'var(--primary)' }}>{s.icon}</span>
              <h3 className="card-title">{s.title}</h3>
            </div>
            <div className="badge" style={{ marginBottom: 8, color: 'var(--primary)', background: 'var(--primary-soft)', borderColor: 'transparent' }}>
              {s.basis}
            </div>
            <p className="small" style={{ margin: 0, color: 'var(--text-2)', lineHeight: 1.75 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 8 }}>
          <Database size={15} style={{ verticalAlign: -2 }} /> 数据存哪里
        </h3>
        <div className="kv">
          <span>当前模式</span>
          <b>本机浏览器存储（IndexedDB）</b>
        </div>
        <div className="kv">
          <span>账号</span>
          <b>{user?.email ?? '—'}（本机账号，密码 PBKDF2 加盐派生后存储）</b>
        </div>
        <div className="kv">
          <span>已记录</span>
          <b>
            {tasks.length} 个任务 · {habits.length} 个打卡 · {journals.length} 篇日志
          </b>
        </div>
        <div className="kv">
          <span>加入时间</span>
          <b>{user ? formatDateTime(user.created_at) : '—'}</b>
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          数据保存在这台电脑的浏览器里，不上传任何服务器；清除浏览器数据会一并清除，建议定期在「设置」里导出备份。
          需要跨设备同步时，可开启云端数据库与云端文件存储，届时数据会自动迁移到云端。
        </p>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: 8 }}>
          <ShieldCheck size={15} style={{ verticalAlign: -2 }} /> 每天 5 分钟的用法
        </h3>
        <ol className="small" style={{ margin: 0, paddingLeft: 20, color: 'var(--text-2)', lineHeight: 1.9 }}>
          <li>早上打开「今日概览」，确认 3 件今天必须推进的事；</li>
          <li>做的时候用「+25 分钟」记录投入，别靠记忆；</li>
          <li>顺手完成今日打卡，进度条会告诉你这个周期还差几次；</li>
          <li>晚上写 3–5 句日志，标一下心情和精力；</li>
          <li>周末做一次周复盘，把没完成的重新排进下周。</li>
        </ol>
      </div>
    </div>
  )
}
