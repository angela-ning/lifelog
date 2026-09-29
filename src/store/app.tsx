import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as repo from '../lib/repo'
import { restoreSession, logout as authLogout } from '../lib/auth'
import type { Checkin, Habit, Journal, Review, Tag, Task, UserProfile } from '../lib/types'

interface Toast {
  id: number
  text: string
  type: 'info' | 'success' | 'error'
}

interface AppCtx {
  user: UserProfile | null
  ready: boolean
  tasks: Task[]
  habits: Habit[]
  checkins: Checkin[]
  journals: Journal[]
  reviews: Review[]
  tags: Tag[]
  reload: () => Promise<void>
  signOut: () => void
  setUser: (u: UserProfile | null) => void
  toast: (text: string, type?: Toast['type']) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [journals, setJournals] = useState<Journal[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const toast = useCallback((text: string, type: Toast['type'] = 'info') => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600)
  }, [])

  useEffect(() => {
    restoreSession().then((session) => {
      setUser(session?.user ?? null)
      setReady(true)
    })
  }, [])

  const reload = useCallback(async () => {
    if (!user) return
    const [t, h, c, j, r, g] = await Promise.all([
      repo.listTasks(user.id),
      repo.listHabits(user.id),
      repo.listCheckins(user.id),
      repo.listJournals(user.id),
      repo.listReviews(user.id),
      repo.listTags(user.id),
    ])
    setTasks(t)
    setHabits(h)
    setCheckins(c)
    setJournals(j)
    setReviews(r)
    setTags(g)
  }, [user])

  useEffect(() => {
    if (user) void reload()
    else {
      setTasks([])
      setHabits([])
      setCheckins([])
      setJournals([])
      setReviews([])
      setTags([])
    }
  }, [user, reload])

  const signOut = useCallback(() => {
    authLogout()
    setUser(null)
  }, [])

  const value = useMemo<AppCtx>(
    () => ({
      user,
      ready,
      tasks,
      habits,
      checkins,
      journals,
      reviews,
      tags,
      reload,
      signOut,
      setUser,
      toast,
    }),
    [user, ready, tasks, habits, checkins, journals, reviews, tags, reload, signOut, toast],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}
