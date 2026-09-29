import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckSquare,
  Info,
  LayoutDashboard,
  LogOut,
  Repeat,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../store/app'

const NAV = [
  { to: '/', label: '今日概览', icon: <LayoutDashboard size={16} /> },
  { to: '/tasks', label: '任务', icon: <CheckSquare size={16} /> },
  { to: '/habits', label: '打卡', icon: <Repeat size={16} /> },
  { to: '/journal', label: '生活日志', icon: <BookOpen size={16} /> },
  { to: '/reviews', label: '复盘', icon: <CalendarClock size={16} /> },
  { to: '/insights', label: '数据洞察', icon: <BarChart3 size={16} /> },
]

const FOOT_NAV = [
  { to: '/about', label: '关于', icon: <Info size={16} /> },
  { to: '/settings', label: '设置', icon: <SettingsIcon size={16} /> },
]

const TITLES: Record<string, { title: string; sub: string }> = {
  '/': { title: '今日概览', sub: '一眼看清今天要做什么、要坚持什么' },
  '/tasks': { title: '任务', sub: '用「下一步行动」的方式拆解每一件事' },
  '/habits': { title: '打卡', sub: '小到不会失败的坚持，才有复利' },
  '/journal': { title: '生活日志', sub: '记录本身，就是一种整理' },
  '/reviews': { title: '复盘', sub: '没有复盘的经历只是经过' },
  '/insights': { title: '数据洞察', sub: '用数据回看自己的节奏' },
  '/about': { title: '关于', sub: '这个站点的设计依据' },
  '/settings': { title: '设置', sub: '账号、标签与数据管理' },
}

export function Layout() {
  const { user, signOut, tasks, habits, journals } = useApp()
  const loc = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const meta = useMemo(() => {
    const path = loc.pathname
    if (path.startsWith('/tasks/')) return { title: '任务详情', sub: '把事情想清楚，做起来才轻' }
    return TITLES[path] ?? { title: '生活记录', sub: '' }
  }, [loc.pathname])

  const counts: Record<string, number> = {
    '/tasks': tasks.filter((t) => t.status !== 'done' && t.status !== 'archived').length,
    '/habits': habits.filter((h) => !h.archived).length,
    '/journal': journals.length,
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <div className="brand-text">
            <strong>生活记录</strong>
            <span>LifeLog · 个人任务与生活档案</span>
          </div>
        </div>

        <div className="nav-section">记录</div>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {item.icon}
            {item.label}
            {counts[item.to] ? <span className="count">{counts[item.to]}</span> : null}
          </NavLink>
        ))}

        <div className="sidebar-foot">
          {FOOT_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
          <div className="user-chip" style={{ marginTop: 6 }}>
            <div className="avatar" style={{ background: user?.avatar_color ?? '#4f46e5' }}>
              {(user?.display_name ?? '我').slice(0, 1)}
            </div>
            <div className="user-meta">
              <strong>{user?.display_name ?? '我'}</strong>
              <span>{user?.email ?? ''}</span>
            </div>
            <button className="btn ghost sm" onClick={signOut} title="退出登录">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{meta.title}</h1>
          </div>
          <div className="spacer" />
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button className="btn ghost sm" onClick={() => setMenuOpen((v) => !v)}>
              <div className="avatar" style={{ background: user?.avatar_color ?? '#4f46e5', width: 24, height: 24, fontSize: 11 }}>
                {(user?.display_name ?? '我').slice(0, 1)}
              </div>
              {user?.display_name ?? '我'}
            </button>
            {menuOpen && (
              <div
                className="card"
                style={{ position: 'absolute', right: 0, top: 40, width: 180, padding: 8, zIndex: 30 }}
              >
                <NavLink to="/settings" className="nav-item" onClick={() => setMenuOpen(false)}>
                  <SettingsIcon size={15} /> 账号与数据
                </NavLink>
                <NavLink to="/about" className="nav-item" onClick={() => setMenuOpen(false)}>
                  <Info size={15} /> 关于本站
                </NavLink>
                <button className="nav-item" style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }} onClick={signOut}>
                  <LogOut size={15} /> 退出登录
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <h2 className="page-title">{meta.title}</h2>
              <p className="page-sub">{meta.sub}</p>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
