import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export interface OrderRecord {
  id: string
  orderNo: string
  userId: string
  bookId: string
  amount: number
  method: 'wechat' | 'alipay' | 'card'
  status: 'paid'
  createdAt: string
}

export interface ReadingRecord {
  bookId: string
  chapterId: string
  /** 章内滚动进度 0-1 */
  ratio: number
  updatedAt: string
}

export interface UserRecord {
  id: string
  nickname: string
  avatarSeed: string
  createdAt: string
  /** 已购买的书籍 */
  purchases: { bookId: string; orderId: string; at: string }[]
  /** 阅读进度 */
  reading: ReadingRecord[]
  orders: OrderRecord[]
}

interface Store {
  users: UserRecord[]
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'store.json')

const seedUsers = (): UserRecord[] => {
  const now = new Date().toISOString()
  return [
    {
      id: 'u-demo',
      nickname: '林间读者',
      avatarSeed: '月',
      createdAt: now,
      purchases: [],
      reading: [],
      orders: [],
    },
  ]
}

let store: Store | null = null

function load(): Store {
  if (store) return store
  try {
    if (fs.existsSync(DATA_FILE)) {
      store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Store
    } else {
      store = { users: seedUsers() }
      persist()
    }
  } catch {
    store = { users: seedUsers() }
  }
  return store!
}

function persist() {
  if (!store) return
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // 文件系统不可写时降级为内存存储
  }
}

export function getUser(userId: string | undefined): UserRecord {
  const s = load()
  const id = userId && userId.trim() ? userId.trim() : 'u-demo'
  let user = s.users.find(u => u.id === id)
  if (!user) {
    user = {
      id,
      nickname: '新读者',
      avatarSeed: '读',
      createdAt: new Date().toISOString(),
      purchases: [],
      reading: [],
      orders: [],
    }
    s.users.push(user)
    persist()
  }
  return user
}

export function createOrder(params: {
  userId: string
  bookId: string
  amount: number
  method: OrderRecord['method']
}): OrderRecord {
  const user = getUser(params.userId)
  const now = new Date()
  const order: OrderRecord = {
    id: randomUUID(),
    orderNo: `SH${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate()
    ).padStart(2, '0')}${Math.floor(Math.random() * 9e5 + 1e5)}`,
    userId: user.id,
    bookId: params.bookId,
    amount: params.amount,
    method: params.method,
    status: 'paid',
    createdAt: now.toISOString(),
  }

  user.orders.unshift(order)
  if (!user.purchases.some(p => p.bookId === params.bookId)) {
    user.purchases.push({ bookId: params.bookId, orderId: order.id, at: order.createdAt })
  }
  persist()
  return order
}

export function hasPurchased(userId: string | undefined, bookId: string): boolean {
  if (!userId) return false
  return getUser(userId).purchases.some(p => p.bookId === bookId)
}

export function saveProgress(
  userId: string | undefined,
  bookId: string,
  chapterId: string,
  ratio: number
) {
  const user = getUser(userId)
  const clamped = Math.max(0, Math.min(1, ratio))
  const existing = user.reading.find(r => r.bookId === bookId)
  if (existing) {
    existing.chapterId = chapterId
    existing.ratio = clamped
    existing.updatedAt = new Date().toISOString()
  } else {
    user.reading.push({
      bookId,
      chapterId,
      ratio: clamped,
      updatedAt: new Date().toISOString(),
    })
  }
  persist()
}
