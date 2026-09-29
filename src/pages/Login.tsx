import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { changePassword, login, register } from '../lib/auth'
import { useApp } from '../store/app'

export function Login() {
  const { user, setUser, toast } = useApp()
  const nav = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // 已登录时直接回到主界面
  useEffect(() => {
    if (user) nav('/', { replace: true })
  }, [user, nav])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result =
        mode === 'login' ? await login(email, password) : await register(email, password, name)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.session) {
        setUser(result.session.user)
        toast(mode === 'login' ? '欢迎回来' : '账号已创建', 'success')
        nav('/', { replace: true })
      }
    } catch {
      setError('浏览器不支持 Web Crypto，无法在本机创建账号')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-mark">
            <Sparkles size={17} />
          </div>
          <div>
            <strong style={{ fontSize: 15 }}>生活记录</strong>
            <div className="muted small">任务 · 打卡 · 日志 · 复盘</div>
          </div>
        </div>

        <div className="segmented" style={{ width: '100%', marginBottom: 16 }}>
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            style={{ flex: 1 }}
            onClick={() => {
              setMode('login')
              setError('')
            }}
          >
            登录
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            style={{ flex: 1 }}
            onClick={() => {
              setMode('register')
              setError('')
            }}
          >
            注册
          </button>
        </div>

        <h2 className="login-title">{mode === 'login' ? '登录你的空间' : '创建一个新空间'}</h2>
        <p className="login-sub">所有数据只属于你，登录后才可读可写。</p>

        <div className="col" style={{ gap: 12 }}>
          {mode === 'register' && (
            <div className="field">
              <label>昵称</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="怎么称呼你？"
              />
            </div>
          )}
          <div className="field">
            <label>邮箱</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="field">
            <label>密码</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              required
            />
          </div>

          {error && (
            <div className="badge" style={{ color: 'var(--danger)', background: 'var(--danger-soft)', borderColor: '#f0c8c8' }}>
              {error}
            </div>
          )}

          <button className="btn primary" disabled={busy} type="submit">
            {busy ? '处理中…' : mode === 'login' ? '登录' : '注册并进入'}
          </button>
        </div>

        <div className="login-note">
          当前为<b>本机账号</b>模式：账号与数据保存在这台电脑的浏览器里，密码经 PBKDF2 加盐派生后存储，明文不会落盘。
          之后开启云端服务，可无缝切换为云端数据库 + 云端文件存储。
        </div>
      </form>
    </div>
  )
}

export function ChangePasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { toast } = useApp()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400 }}>
        <div className="modal-head">
          <h3>修改密码</h3>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>当前密码</label>
            <input className="input" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} />
          </div>
          <div className="field">
            <label>新密码</label>
            <input className="input" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button
            className="btn primary"
            onClick={async () => {
              const res = await changePassword(userId, oldPwd, newPwd)
              if (res.error) toast(res.error, 'error')
              else {
                toast('密码已更新', 'success')
                onClose()
              }
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
