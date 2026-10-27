import { Router, Request, Response } from 'express'
import { BOOKS, findBook, chapterWordCount, Book } from '../data/books.js'
import { createOrder, getUser, hasPurchased, saveProgress } from '../store/index.js'
import { AppError } from '../middleware/errorHandler.js'

export const booksRouter: Router = Router()

const getUserId = (req: Request) => {
  const header = req.headers['x-user-id']
  if (typeof header === 'string' && header.trim()) return header.trim()
  const bodyId = (req.body as { userId?: unknown } | undefined)?.userId
  if (typeof bodyId === 'string' && bodyId.trim()) return bodyId.trim()
  const query = req.query.userId
  if (typeof query === 'string' && query.trim()) return query.trim()
  return 'u-demo'
}

/** 书籍摘要（不含正文） */
const toSummary = (book: Book, userId: string) => {
  const purchased = hasPurchased(userId, book.id)
  const user = getUser(userId)
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    author: book.author,
    category: book.category,
    tags: book.tags,
    rating: book.rating,
    ratingCount: book.ratingCount,
    readCount: book.readCount,
    price: book.price,
    originalPrice: book.originalPrice,
    coverFrom: book.coverFrom,
    coverTo: book.coverTo,
    coverGlyph: book.coverGlyph,
    previewRatio: book.previewRatio,
    intro: book.intro,
    highlights: book.highlights,
    chapterCount: book.chapters.length,
    totalWords: book.chapters.reduce((s, c) => s + c.wordCount, 0),
    purchased,
    reading: user.reading.find(r => r.bookId === book.id) ?? null,
  }
}

/**
 * 按试读比例裁剪正文：
 * - previewParagraphs：试读段落（原文，未删减）
 * - lockedParagraphCount：被锁定的段落数量
 * - teaser：锁定区第一段前 60 字，仅用于视觉暗示（不够成可阅读内容）
 */
const buildChapterPayload = (book: Book, chapterIndex: number) => {
  const chapter = book.chapters[chapterIndex]
  const total = chapter.paragraphs.length
  const previewCount = Math.max(1, Math.min(total, Math.ceil(total * book.previewRatio)))
  const lockedParagraphs = chapter.paragraphs.slice(previewCount)
  const previewParagraphs = chapter.paragraphs.slice(0, previewCount)
  const teaser = lockedParagraphs.length
    ? lockedParagraphs[0].slice(0, Math.min(40, lockedParagraphs[0].length))
    : ''

  return {
    id: chapter.id,
    index: chapter.index,
    title: chapter.title,
    wordCount: chapter.wordCount,
    paragraphCount: total,
    previewParagraphs,
    previewCount,
    lockedParagraphCount: lockedParagraphs.length,
    lockedWordCount: chapterWordCount(lockedParagraphs),
    teaser,
  }
}

/** 书籍列表 */
booksRouter.get('/', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const category = typeof req.query.category === 'string' ? req.query.category : ''
  const keyword = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  let list = BOOKS.map(b => toSummary(b, userId))
  if (category && category !== '全部') {
    list = list.filter(b => b.category === category)
  }
  if (keyword) {
    const k = keyword.toLowerCase()
    list = list.filter(
      b =>
        b.title.toLowerCase().includes(k) ||
        b.author.toLowerCase().includes(k) ||
        b.tags.some(t => t.toLowerCase().includes(k))
    )
  }

  res.json({
    total: list.length,
    categories: ['全部', ...Array.from(new Set(BOOKS.map(b => b.category)))],
    books: list,
  })
})

/** 我的书架 */
booksRouter.get('/mine', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const user = getUser(userId)
  const purchased = user.purchases
    .map(p => {
      const book = findBook(p.bookId)
      if (!book) return null
      return {
        ...toSummary(book, userId),
        purchaseAt: p.at,
        lastRead: user.reading.find(r => r.bookId === book.id) ?? null,
      }
    })
    .filter(Boolean)

  res.json({
    user: { id: user.id, nickname: user.nickname, avatarSeed: user.avatarSeed },
    count: purchased.length,
    books: purchased,
    orders: user.orders.slice(0, 10),
  })
})

/** 书籍详情（含目录，正文不可见） */
booksRouter.get('/:id', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const book = findBook(String(req.params.id))
  if (!book) throw new AppError(404, '书籍不存在')

  const summary = toSummary(book, userId)
  res.json({
    ...summary,
    authorBio: book.authorBio,
    chapters: book.chapters.map(c => ({
      id: c.id,
      index: c.index,
      title: c.title,
      wordCount: c.wordCount,
      previewCount: Math.max(1, Math.ceil(c.paragraphs.length * book.previewRatio)),
      paragraphCount: c.paragraphs.length,
    })),
  })
})

/** 章节正文（试读截断 + 付费解锁） */
booksRouter.get('/:id/chapters/:chapterId', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const book = findBook(String(req.params.id))
  if (!book) throw new AppError(404, '书籍不存在')

  const index = book.chapters.findIndex(c => c.id === String(req.params.chapterId))
  if (index < 0) throw new AppError(404, '章节不存在')

  const purchased = hasPurchased(userId, book.id)
  const payload = buildChapterPayload(book, index)

  res.json({
    bookId: book.id,
    bookTitle: book.title,
    purchased,
    price: book.price,
    previewRatio: book.previewRatio,
    chapters: book.chapters.map(c => ({ id: c.id, index: c.index, title: c.title })),
    chapter: purchased
      ? {
          ...payload,
          // 已购买：返回完整正文
          fullParagraphs: book.chapters[index].paragraphs,
          previewParagraphs: book.chapters[index].paragraphs,
          lockedParagraphCount: 0,
          lockedWordCount: 0,
          teaser: '',
        }
      : payload,
    prevChapterId: index > 0 ? book.chapters[index - 1].id : null,
    nextChapterId: index < book.chapters.length - 1 ? book.chapters[index + 1].id : null,
  })
})

/** 解锁（模拟支付） */
booksRouter.post('/:id/purchase', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const book = findBook(String(req.params.id))
  if (!book) throw new AppError(404, '书籍不存在')

  const method = req.body?.method
  if (!['wechat', 'alipay', 'card'].includes(method)) {
    throw new AppError(400, '请选择有效的支付方式')
  }

  if (hasPurchased(userId, book.id)) {
    res.json({ alreadyPurchased: true, message: '你已拥有这本书' })
    return
  }

  const order = createOrder({
    userId,
    bookId: book.id,
    amount: book.price,
    method,
  })

  res.json({
    success: true,
    alreadyPurchased: false,
    order,
    message: '解锁成功，全书内容已开放',
  })
})

/** 保存阅读进度 */
booksRouter.post('/:id/progress', (req: Request, res: Response) => {
  const userId = getUserId(req)
  const book = findBook(String(req.params.id))
  if (!book) throw new AppError(404, '书籍不存在')

  const { chapterId, ratio } = req.body ?? {}
  if (typeof chapterId !== 'string' || !book.chapters.some(c => c.id === chapterId)) {
    throw new AppError(400, '无效的章节')
  }
  saveProgress(userId, book.id, chapterId, Number(ratio) || 0)
  res.json({ success: true })
})
