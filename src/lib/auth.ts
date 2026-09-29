/**
 * 本地账号与会话
 *
 * 当前版本运行在浏览器本地：账号与密码哈希保存在本机 IndexedDB 中，
 * 密码使用 PBKDF2-SHA256（10 万次迭代 + 随机盐）派生，明文密码不会落盘。
 * 会话写入 localStorage，刷新后保持登录。
 *
 * 之后切换到云端认证时，只需替换本文件里的 register / login / logout 实现，
 * 上层（AuthProvider、页面）无需改动。
 */
import { getAll, getOne, put, uid } from './db'
import type { UserProfile } from './types'

export interface StoredUser extends UserProfile {
  password_hash: string
  salt: string
}

const SESSION_KEY = 'lifelog.session'
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30 // 30 天
const ITERATIONS = 100_000

export interface Session {
  user: UserProfile
  expires_at: number
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function derive(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltHex),
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return toHex(bits)
}

function randomSalt(): string {
  const arr = new Uint8Array(16)
  crypto.getRandomValues(arr)
  return toHex(arr.buffer)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))
}

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#16a34a', '#d97706', '#db2777', '#7c3aed']

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<{ session?: Session; error?: string }> {
  const mail = normalizeEmail(email)
  if (!validateEmail(mail)) return { error: '请输入有效的邮箱地址' }
  if (password.length < 6) return { error: '密码至少 6 位' }
  const users = await getAll<StoredUser>('users')
  if (users.some((u) => u.email === mail)) return { error: '该邮箱已注册，请直接登录' }

  const salt = randomSalt()
  const hash = await derive(password, salt)
  const now = new Date().toISOString()
  const user: StoredUser = {
    id: uid('u_'),
    email: mail,
    display_name: displayName.trim() || mail.split('@')[0],
    avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    bio: '',
    created_at: now,
    password_hash: hash,
    salt,
  }
  await put('users', user)
  return { session: await startSession(user) }
}

export async function login(
  email: string,
  password: string,
): Promise<{ session?: Session; error?: string }> {
  const mail = normalizeEmail(email)
  const users = await getAll<StoredUser>('users')
  const user = users.find((u) => u.email === mail)
  if (!user) return { error: '邮箱或密码不正确' }
  const hash = await derive(password, user.salt)
  if (hash !== user.password_hash) return { error: '邮箱或密码不正确' }
  return { session: await startSession(user) }
}

function publicUser(u: StoredUser): UserProfile {
  const { password_hash: _ph, salt: _s, ...rest } = u
  return rest
}

async function startSession(u: StoredUser): Promise<Session> {
  const session: Session = {
    user: publicUser(u),
    expires_at: Date.now() + SESSION_TTL,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function restoreSession(): Promise<Session | null> {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    if (!session?.user?.id || session.expires_at < Date.now()) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    const stored = await getOne<StoredUser>('users', session.user.id)
    if (!stored) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    const refreshed: Session = { user: publicUser(stored), expires_at: session.expires_at }
    localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed))
    return refreshed
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'display_name' | 'bio' | 'avatar_color'>>,
): Promise<UserProfile | null> {
  const stored = await getOne<StoredUser>('users', userId)
  if (!stored) return null
  const next = { ...stored, ...patch }
  await put('users', next)
  const session = await startSession(next)
  return session.user
}

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (newPassword.length < 6) return { error: '新密码至少 6 位' }
  const stored = await getOne<StoredUser>('users', userId)
  if (!stored) return { error: '账号不存在' }
  const hash = await derive(oldPassword, stored.salt)
  if (hash !== stored.password_hash) return { error: '当前密码不正确' }
  const salt = randomSalt()
  await put('users', { ...stored, salt, password_hash: await derive(newPassword, salt) })
  return { ok: true }
}

export async function hasAnyUser(): Promise<boolean> {
  const users = await getAll<StoredUser>('users')
  return users.length > 0
}
