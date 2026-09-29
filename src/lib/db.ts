/**
 * 本地持久化层（IndexedDB）
 *
 * 对外暴露的是一张张「表」的读写接口，业务层只通过 repo 访问这里，
 * 所有读写都带上 owner_id 过滤（等价于云端的 RLS 行级隔离）。
 */

const DB_NAME = 'lifelog'
const DB_VERSION = 1

export const STORES = [
  'users',
  'tasks',
  'habits',
  'checkins',
  'journals',
  'attachments',
  'tags',
  'reviews',
  'settings',
  'files',
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      const ensure = (name: StoreName, keyPath: string | string[]) => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath })
      }
      ensure('users', 'id')
      ensure('tasks', 'id')
      ensure('habits', 'id')
      ensure('checkins', 'id')
      ensure('journals', 'id')
      ensure('attachments', 'id')
      ensure('tags', 'id')
      ensure('reviews', 'id')
      ensure('settings', 'key')
      ensure('files', 'key')
      // 常用索引
      const tasks = req.transaction!.objectStore('tasks')
      if (!tasks.indexNames.contains('owner_id')) tasks.createIndex('owner_id', 'owner_id')
      const habits = req.transaction!.objectStore('habits')
      if (!habits.indexNames.contains('owner_id')) habits.createIndex('owner_id', 'owner_id')
      const checkins = req.transaction!.objectStore('checkins')
      if (!checkins.indexNames.contains('owner_id')) checkins.createIndex('owner_id', 'owner_id')
      if (!checkins.indexNames.contains('habit_id')) checkins.createIndex('habit_id', 'habit_id')
      const journals = req.transaction!.objectStore('journals')
      if (!journals.indexNames.contains('owner_id')) journals.createIndex('owner_id', 'owner_id')
      const attachments = req.transaction!.objectStore('attachments')
      if (!attachments.indexNames.contains('owner_id'))
        attachments.createIndex('owner_id', 'owner_id')
      if (!attachments.indexNames.contains('ref_id')) attachments.createIndex('ref_id', 'ref_id')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
}

export async function getByIndex<T>(store: StoreName, index: string, value: IDBValidKey): Promise<T[]> {
  const db = await openDB()
  return new Promise<T[]>((resolve, reject) => {
    const t = db.transaction(store, 'readonly')
    const idx = t.objectStore(store).index(index)
    const req = idx.getAll(value)
    req.onsuccess = () => resolve(req.result as T[])
    req.onerror = () => reject(req.error)
  })
}

export async function getOne<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
  return tx<T | undefined>(store, 'readonly', (s) => s.get(key) as IDBRequest<T | undefined>)
}

export async function put<T>(store: StoreName, value: T): Promise<T> {
  await tx(store, 'readwrite', (s) => s.put(value as unknown as never) as IDBRequest<IDBValidKey>)
  return value
}

export async function bulkPut<T>(store: StoreName, values: T[]): Promise<void> {
  if (!values.length) return
  const db = await openDB()
  return new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, 'readwrite')
    const s = t.objectStore(store)
    values.forEach((v) => s.put(v as unknown as never))
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function remove(store: StoreName, key: IDBValidKey): Promise<void> {
  await tx(store, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>)
}

export async function clearStore(store: StoreName): Promise<void> {
  await tx(store, 'readwrite', (s) => s.clear() as IDBRequest<undefined>)
}

export function uid(prefix = ''): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return `${prefix}${Date.now().toString(36)}${rand}`
}
