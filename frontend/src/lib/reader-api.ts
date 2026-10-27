import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./api-client";

export type PayMethod = "wechat" | "alipay" | "card";

export interface ReadingRecord {
  bookId: string;
  chapterId: string;
  ratio: number;
  updatedAt: string;
}

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  category: string;
  tags: string[];
  rating: number;
  ratingCount: number;
  readCount: string;
  price: number;
  originalPrice: number;
  coverFrom: string;
  coverTo: string;
  coverGlyph: string;
  previewRatio: number;
  intro: string;
  highlights: string[];
  chapterCount: number;
  totalWords: number;
  purchased: boolean;
  reading: ReadingRecord | null;
}

export interface ChapterMeta {
  id: string;
  index: number;
  title: string;
  wordCount: number;
  previewCount: number;
  paragraphCount: number;
}

export interface BookDetail extends BookSummary {
  authorBio: string;
  chapters: ChapterMeta[];
}

export interface ChapterPayload {
  id: string;
  index: number;
  title: string;
  wordCount: number;
  paragraphCount: number;
  previewParagraphs: string[];
  previewCount: number;
  lockedParagraphCount: number;
  lockedWordCount: number;
  teaser: string;
  fullParagraphs?: string[];
}

export interface ChapterResponse {
  bookId: string;
  bookTitle: string;
  purchased: boolean;
  price: number;
  previewRatio: number;
  chapters: { id: string; index: number; title: string }[];
  chapter: ChapterPayload;
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export interface BookListResponse {
  total: number;
  categories: string[];
  books: BookSummary[];
}

export interface MineResponse {
  user: { id: string; nickname: string; avatarSeed: string };
  count: number;
  books: (BookSummary & { purchaseAt: string; lastRead: ReadingRecord | null })[];
  orders: {
    id: string;
    orderNo: string;
    bookId: string;
    amount: number;
    method: PayMethod;
    createdAt: string;
  }[];
}

/* ---------------- 用户身份（本地生成，模拟登录态） ---------------- */
const USER_KEY = "yedu:userId";

export function getUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `u-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

apiClient.defaults.headers.common["X-User-Id"] = getUserId();

/* ---------------- 本地阅读偏好 ---------------- */
export interface ReaderPrefs {
  fontSize: number;
  theme: "sepia" | "paper" | "night";
  measure: "narrow" | "normal" | "wide";
}

const PREFS_KEY = "yedu:prefs";
const defaultPrefs: ReaderPrefs = { fontSize: 19, theme: "sepia", measure: "normal" };

export function useReaderPrefs() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  return [prefs, setPrefs] as const;
}

/* ---------------- API ---------------- */
export const money = (cents: number) =>
  (cents / 100).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const useBooks = (category: string, q: string) =>
  useQuery<BookListResponse>({
    queryKey: ["books", category, q, getUserId()],
    queryFn: async () => {
      const { data } = await apiClient.get<BookListResponse>("/books", {
        params: { category, q },
      });
      return data;
    },
  });

export const useBook = (id?: string) =>
  useQuery<BookDetail>({
    queryKey: ["book", id, getUserId()],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data } = await apiClient.get<BookDetail>(`/books/${id}`);
      return data;
    },
  });

export const useMine = () =>
  useQuery<MineResponse>({
    queryKey: ["mine", getUserId()],
    queryFn: async () => {
      const { data } = await apiClient.get<MineResponse>("/books/mine");
      return data;
    },
  });

export const fetchChapter = async (bookId: string, chapterId: string) => {
  const { data } = await apiClient.get<ChapterResponse>(
    `/books/${bookId}/chapters/${chapterId}`,
  );
  return data;
};

export const purchaseBook = async (bookId: string, method: PayMethod) => {
  const { data } = await apiClient.post(`/books/${bookId}/purchase`, { method });
  return data as {
    success: boolean;
    alreadyPurchased: boolean;
    order: { orderNo: string; amount: number; createdAt: string };
    message: string;
  };
};

export const saveProgress = (bookId: string, chapterId: string, ratio: number) =>
  apiClient
    .post(`/books/${bookId}/progress`, { chapterId, ratio })
    .catch(() => undefined);
