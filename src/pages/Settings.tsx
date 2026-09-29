import { useRef, useState } from 'react'
import { Download, KeyRound, ShieldAlert, Tags, Upload, UserCog } from 'lucide-react'
import { useApp } from '../store/app'
import * as repo from '../lib/repo'
import { updateProfile } from '../lib/auth'
import { downloadBlob, formatBytes } from '../lib/files'
import { TAG_COLORS } from '../lib/types'
import { Confirm, Field, Stat } from '../components/ui'
import { ChangePasswordModal } from './Login'

export function Settings() {
  const { user, tags, tasks, habits, journals, checkins, reload, toast, setUser } = useApp()
  const [displayName, setDisplayName] = useState(user?.display_name ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [color, setColor] = useState(user?.avatar_color ?? '#4f46e5')
  const [pwdOpen, setPwdOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [tagName, setTagName] = useState('')
  const [tagColor, setTagColor] = useState(TAG_COLORS[0])
  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  async function saveProfile() {
    const next = await updateProfile(user!.id, { display_name: displayName, bio, avatar_color: color })
    if (next) {
      setUser(next)
      toast('资料已更新', 'success')
    }
  }

  async function exportData() {
    const data = await repo.exportBackup(user!.id)
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `lifelog-backup-${data.exported_at.slice(0, 10)}.json`)
    toast('备份已下载', 'success')
  }

  async function importData(file: File) {
    try {
      const json = JSON.parse(await file.text()) as Awaited<ReturnType<typeof repo.exportBackup>>
      await repo.importBackup(user!.id, json)
      await reload()
      toast('数据已导入', 'success')
    } catch {
      toast('导入失败：文件不是有效的备份 JSON', 'error')
    }
  }

  const attachmentsCount = tasks.length + journals.length
  const storageNote = `${tasks.length} 任务 · ${habits.length} 打卡 · ${checkins.length} 打卡记录 · ${journals.length} 日志`

  return (
    <div className="col">
      <div className="grid cols-3">
        <Stat label="任务" value={tasks.length} />
        <Stat label="打卡记录" value={checkins.length} />
        <Stat label="日志" value={journals.length} />
      </div>

      <div className="grid cols-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head">
            <UserCog size={15} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">账号资料</h3>
          </div>
          <Field label="昵称">
            <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <div style={{ height: 10 }} />
          <Field label="一句话简介">
            <input className="input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="写给自己看的" />
          </Field>
          <div style={{ height: 10 }} />
          <Field label="头像颜色">
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
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn primary" onClick={() => void saveProfile()}>
              保存资料
            </button>
            <button className="btn" onClick={() => setPwdOpen(true)}>
              <KeyRound size={13} /> 修改密码
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            登录邮箱：{user.email}
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <Tags size={15} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">标签管理</h3>
            <div className="spacer" />
            <span className="muted small">{tags.length} 个</span>
          </div>
          <div className="chip-row">
            {tags.map((t) => (
              <span key={t.id} className="tag" style={{ color: t.color }}>
                <i className="tag-dot" style={{ background: t.color }} />
                {t.name}
                <button
                  className="btn ghost sm"
                  style={{ padding: 0, marginLeft: 2 }}
                  onClick={async () => {
                    await repo.deleteTag(user.id, t.id)
                    await reload()
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length === 0 && <span className="muted small">还没有标签</span>}
          </div>
          <div className="divider" />
          <div className="row wrap">
            <input
              className="input"
              style={{ width: 140 }}
              placeholder="新标签名称"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
            />
            <div className="row" style={{ gap: 4 }}>
              {TAG_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setTagColor(c)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: c,
                    border: tagColor === c ? '2px solid #1f2430' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <button
              className="btn"
              onClick={async () => {
                if (!tagName.trim()) return
                await repo.createTag(user.id, tagName.trim(), tagColor)
                setTagName('')
                await reload()
              }}
            >
              添加标签
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <Download size={15} style={{ color: 'var(--primary)' }} />
            <h3 className="card-title">数据备份</h3>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            当前数据：{storageNote}
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn primary" onClick={() => void exportData()}>
              <Download size={13} /> 导出 JSON 备份
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> 导入备份
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importData(f)
                e.target.value = ''
              }}
            />
          </div>
          <p className="muted small">
            导入会按 ID 覆盖同名记录，附件二进制不包含在 JSON 中（导出的是结构与元数据）。
            建议每月导出一次。
          </p>
        </div>

        <div className="card">
          <div className="card-head">
            <ShieldAlert size={15} style={{ color: 'var(--danger)' }} />
            <h3 className="card-title">危险操作</h3>
          </div>
          <p className="muted small" style={{ marginTop: 0 }}>
            清空后，{storageNote} 与相关附件都会被永久删除，无法恢复。建议先导出备份。
          </p>
          <button className="btn danger" onClick={() => setConfirmClear(true)}>
            清空我的全部数据
          </button>
          <p className="muted small">
            估算占用：约 {formatBytes(attachmentsCount * 512)}（不含附件二进制）
          </p>
        </div>
      </div>

      {pwdOpen && <ChangePasswordModal userId={user.id} onClose={() => setPwdOpen(false)} />}
      {confirmClear && (
        <Confirm
          title="清空全部数据"
          message="这会删除该账号下的全部任务、打卡、日志、复盘、标签与附件，且不可恢复。确定继续吗？"
          confirmText="确认清空"
          onConfirm={async () => {
            await repo.deleteOwnerData(user.id)
            await reload()
            setConfirmClear(false)
            toast('数据已清空', 'success')
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
