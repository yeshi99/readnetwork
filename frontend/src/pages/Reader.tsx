import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Eye,
  Expand,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
  Type,
  X,
} from "lucide-react";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { BookCover } from "@/components/BookCover";
import {
  fetchChapter,
  getUserId,
  money,
  saveProgress,
  useBook,
  useReaderPrefs,
  type ChapterResponse,
} from "@/lib/reader-api";
import { cn } from "@/lib/utils";

const THEMES = {
  sepia: { key: "sepia", label: "米色", bg: "#f4ecdd", paper: "#f9f4e9", ink: "#2b271f", sub: "#8a8272" },
  paper: { key: "paper", label: "白纸", bg: "#eceff1", paper: "#ffffff", ink: "#1f2225", sub: "#8a8f95" },
  night: { key: "night", label: "夜间", bg: "#15171a", paper: "#1c1f23", ink: "#c9c4b8", sub: "#6f757c" },
} as const;

const MEASURE = { narrow: 560, normal: 660, wide: 780 } as const;

export default function Reader() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useReaderPrefs();

  const { data: book, isLoading: bookLoading } = useBook(id);
  const chapterId = searchParams.get("chapter") ?? book?.chapters[0]?.id ?? "c1";

  const { data, isLoading, refetch } = useQuery<ChapterResponse>({
    queryKey: ["chapter", id, chapterId, getUserId()],
    enabled: Boolean(id),
    queryFn: () => fetchChapter(id!, chapterId),
  });

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  const theme = THEMES[prefs.theme];

  const goChapter = useCallback(
    (cid: string) => {
      setSearchParams({ chapter: cid }, { replace: true });
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setSearchParams],
  );

  /* 阅读进度上报（防抖） */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        const max = el.scrollHeight - el.clientHeight;
        const ratio = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
        if (id && data) saveProgress(id, data.chapter.id, ratio);
      }, 700);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [id, data]);

  const chapters = data?.chapters ?? [];
  const current = data?.chapter;
  const purchased = data?.purchased ?? false;
  const paragraphs = current ? (purchased ? current.fullParagraphs ?? [] : current.previewParagraphs) : [];
  const lockedCount = current && !purchased ? current.lockedParagraphCount : 0;

  const ghostCount = useMemo(() => Math.min(6, Math.max(3, Math.round(lockedCount * 0.6))), [lockedCount]);

  const progressPct = chapters.length
    ? Math.round(((chapters.findIndex((c) => c.id === chapterId) + 1) / chapters.length) * 100)
    : 0;

  const handlePaid = async () => {
    setCheckoutOpen(false);
    await refetch();
    setJustUnlocked(true);
    window.setTimeout(() => setJustUnlocked(false), 2600);
  };

  if (bookLoading || isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4ecdd]">
        <div className="flex flex-col items-center gap-3 text-[#8a8272]">
          <BookOpen className="h-6 w-6 animate-pulse" />
          <span className="text-xs tracking-[0.3em]">正在翻开这一页…</span>
        </div>
      </div>
    );
  }

  if (!book || !current || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4ecdd]">
        <div className="text-center">
          <p className="font-serif text-xl">没有找到这本书</p>
          <button onClick={() => navigate("/")} className="mt-3 text-sm text-[#8a2b1e] underline">
            回到书架
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: theme.bg, color: theme.ink }}>
      {/* 顶部栏 */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-md"
        style={{ borderColor: "rgba(0,0,0,0.08)", background: `${theme.paper}e6` }}
      >
        <div className="mx-auto flex h-14 max-w-[1240px] items-center gap-3 px-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs transition-colors hover:bg-black/5"
            style={{ color: theme.sub }}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 书架
          </Link>
          <div className="hidden h-4 w-px bg-black/10 sm:block" />
          <div className="min-w-0 flex-1">
            <div className="truncate font-serif text-sm font-semibold">{book.title}</div>
            <div className="truncate text-[11px]" style={{ color: theme.sub }}>
              {book.author} · {current.title}
            </div>
          </div>

          <div className="hidden items-center gap-1.5 md:flex">
            <button
              onClick={() => setTocOpen(true)}
              className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-black/5"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: theme.sub }}
            >
              目录 · {chapters.length} 章
            </button>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full border transition-colors hover:bg-black/5"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: theme.sub }}
              aria-label="阅读设置"
            >
              <Type className="h-3.5 w-3.5" />
            </button>
          </div>

          {purchased ? (
            <span className="rounded-full bg-[#3f6b4f]/12 px-2.5 py-1 text-[11px] text-[#3f6b4f]">
              已解锁全书
            </span>
          ) : (
            <button
              onClick={() => setCheckoutOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#8a2b1e] px-3.5 py-1.5 text-xs text-white transition-transform hover:-translate-y-0.5"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              解锁全书 ¥{money(book.price)}
            </button>
          )}
        </div>
        {/* 进度条 */}
        <div className="h-[2px] w-full bg-black/5">
          <div
            className="h-full bg-[#c9a227] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* 设置面板 */}
      <AnimatePresence>
        {settingsOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed right-4 top-[62px] z-50 w-[280px] rounded-xl border border-black/10 p-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.45)]"
            style={{ background: theme.paper }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">阅读设置</span>
              <button onClick={() => setSettingsOpen(false)} className="opacity-50 hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs">
              <div>
                <div className="mb-2 opacity-60">字号</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.max(15, p.fontSize - 1) }))}
                    className="grid h-8 w-8 place-items-center rounded-md border border-black/12"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <div className="flex-1 text-center font-serif text-base">{prefs.fontSize}px</div>
                  <button
                    onClick={() => setPrefs((p) => ({ ...p, fontSize: Math.min(28, p.fontSize + 1) }))}
                    className="grid h-8 w-8 place-items-center rounded-md border border-black/12"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div>
                <div className="mb-2 opacity-60">背景</div>
                <div className="flex gap-2">
                  {Object.values(THEMES).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setPrefs((p) => ({ ...p, theme: t.key }))}
                      className={cn(
                        "flex-1 rounded-md border py-2 text-[11px]",
                        prefs.theme === t.key ? "border-[#c9a227] ring-2 ring-[#c9a227]/25" : "border-black/12",
                      )}
                      style={{ background: t.paper, color: t.ink }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 opacity-60">版心宽度</div>
                <div className="flex gap-2">
                  {(
                    [
                      ["narrow", "窄"],
                      ["normal", "中"],
                      ["wide", "宽"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setPrefs((p) => ({ ...p, measure: k }))}
                      className={cn(
                        "flex-1 rounded-md border py-1.5",
                        prefs.measure === k ? "border-[#c9a227] bg-[#c9a227]/10" : "border-black/12",
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 正文 */}
      <div ref={scrollRef} className="reader-scroll h-[calc(100vh-58px)] overflow-y-auto">
        <main
          className="mx-auto px-6 pb-24 pt-12"
          style={{ maxWidth: MEASURE[prefs.measure], background: "transparent" }}
        >
          {/* 章首 */}
          <div className="mb-10 text-center">
            <div className="text-[11px] tracking-[0.4em]" style={{ color: theme.sub }}>
              {book.title} · 第 {current.index} 章
            </div>
            <h1 className="mt-3 font-serif text-2xl font-semibold sm:text-3xl">{current.title}</h1>
            <div className="mx-auto mt-5 flex items-center justify-center gap-3 text-[11px]" style={{ color: theme.sub }}>
              <span>{current.wordCount.toLocaleString()} 字</span>
              <span className="h-3 w-px bg-current opacity-30" />
              <span>本章共 {current.paragraphCount} 段</span>
              {!purchased ? (
                <>
                  <span className="h-3 w-px bg-current opacity-30" />
                  <span className="text-[#8a2b1e]">
                    试读 {current.previewCount}/{current.paragraphCount} 段
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {/* 试读正文 */}
          <article
            className="reader-body"
            style={{ fontSize: `${prefs.fontSize}px`, color: theme.ink }}
          >
            {paragraphs.map((p, i) => (
              <p key={`${current.id}-${i}`}>{p}</p>
            ))}
          </article>

          {/* ================= 付费墙 ================= */}
          {!purchased && lockedCount > 0 ? (
            <div className="relative mt-2">
              {/* 模糊残影：仅为视觉暗示 */}
              <div className="relative overflow-hidden">
                <div
                  className="locked-ghost fade-mask reader-body select-none"
                  style={{ fontSize: `${prefs.fontSize}px`, color: theme.ink, lineHeight: 1.95 }}
                  aria-hidden
                >
                  {Array.from({ length: ghostCount }).map((_, i) => (
                    <p key={i}>
                      {"　"}
                      {(i === 0
                        ? current.teaser
                        : "　".repeat(2) + "•••") +
                        "•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••".slice(
                          0,
                          40 + ((i * 13) % 26),
                        )}
                    </p>
                  ))}
                </div>
                {/* 遮罩渐变 */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, ${theme.paper}00 0%, ${theme.paper}d0 42%, ${theme.paper} 78%)`,
                  }}
                />
              </div>

              {/* 付费卡片 */}
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="relative -mt-10 rounded-2xl border p-6 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.55)] sm:p-8"
                style={{
                  borderColor: "rgba(201,162,39,0.45)",
                  background: theme.paper,
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[#1c1a17]">
                    <Eye className="h-5 w-5 text-[#f0d68a]" />
                  </div>
                  <h2 className="mt-4 font-serif text-xl font-semibold sm:text-2xl">
                    本章还剩 {lockedCount} 段被遮住
                  </h2>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed" style={{ color: theme.sub }}>
                    试读到这里结束。后面的 {current.lockedWordCount.toLocaleString()} 字，以及全书其余{" "}
                    {book.chapterCount - 1} 章，购买后即可完整阅读。
                  </p>

                  <div className="mt-6 flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#8a2b1e] px-6 py-3 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      支付 ¥{money(book.price)} 解锁全书
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px]" style={{ color: theme.sub }}>
                    <span>原价 ¥{money(book.originalPrice)}，现省 ¥{money(book.originalPrice - book.price)}</span>
                    <span className="hidden h-3 w-px bg-current opacity-30 sm:block" />
                    <span>一次购买，永久可读</span>
                    <span className="hidden h-3 w-px bg-current opacity-30 sm:block" />
                    <span>支持微信 / 支付宝 / 银行卡</span>
                  </div>
                </div>

                {/* 卖点 */}
                <div className="mt-7 grid gap-px overflow-hidden rounded-lg border border-black/8 bg-black/8 sm:grid-cols-3">
                  {[
                    { k: `${book.totalWords.toLocaleString()} 字`, v: "全书完整正文" },
                    { k: `${book.chapterCount} 章`, v: "含全部结局" },
                    { k: `${book.rating.toFixed(1)} 分`, v: `${book.ratingCount} 人评分` },
                  ].map((s) => (
                    <div key={s.v} className="px-3 py-3 text-center" style={{ background: theme.paper }}>
                      <div className="font-serif text-base font-semibold">{s.k}</div>
                      <div className="mt-0.5 text-[10px]" style={{ color: theme.sub }}>
                        {s.v}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : null}

          {/* 章节导航 */}
          <nav className="mt-12 flex items-center justify-between gap-3 border-t pt-6" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
            <button
              disabled={!data.prevChapterId}
              onClick={() => data.prevChapterId && goChapter(data.prevChapterId)}
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs disabled:opacity-35"
              style={{ borderColor: "rgba(0,0,0,0.14)", color: theme.ink }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> 上一章
            </button>
            <button
              onClick={() => setTocOpen(true)}
              className="text-xs underline-offset-4 hover:underline"
              style={{ color: theme.sub }}
            >
              查看目录
            </button>
            {data.nextChapterId ? (
              <button
                onClick={() => {
                  if (!purchased && lockedCount > 0) {
                    setCheckoutOpen(true);
                    return;
                  }
                  goChapter(data.nextChapterId!);
                }}
                className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs text-white"
                style={{ background: !purchased && lockedCount > 0 ? "#8a8272" : "#1c1a17" }}
              >
                {!purchased && lockedCount > 0 ? "解锁后继续" : "下一章"}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-xs" style={{ color: theme.sub }}>
                已是最后一章
              </span>
            )}
          </nav>

          {/* 书籍简介 */}
          <section className="mt-14 rounded-xl border p-6" style={{ borderColor: "rgba(0,0,0,0.1)", background: `${theme.paper}b0` }}>
            <div className="flex gap-5">
              <BookCover
                title={book.title}
                author={book.author}
                glyph={book.coverGlyph}
                from={book.coverFrom}
                to={book.coverTo}
                className="h-[124px] w-[88px]"
                size="sm"
              />
              <div className="min-w-0">
                <h3 className="font-serif text-base font-semibold">关于《{book.title}》</h3>
                <p className="mt-2 text-[12px] leading-relaxed" style={{ color: theme.sub }}>
                  {book.intro}
                </p>
                <p className="mt-2 text-[11px]" style={{ color: theme.sub }}>
                  作者：{book.author} · {book.category}
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* 目录抽屉 */}
      <AnimatePresence>
        {tocOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-sm"
            onClick={() => setTocOpen(false)}
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute right-0 top-0 h-full w-[340px] max-w-[88vw] overflow-y-auto p-6"
              style={{ background: theme.paper }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.3em]" style={{ color: theme.sub }}>
                    CONTENTS
                  </div>
                  <h3 className="mt-1 font-serif text-lg font-semibold">目录</h3>
                </div>
                <button onClick={() => setTocOpen(false)} className="opacity-60 hover:opacity-100">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-1">
                {chapters.map((c) => {
                  const isCurrent = c.id === chapterId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setTocOpen(false);
                        goChapter(c.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors",
                        isCurrent ? "bg-[#c9a227]/15" : "hover:bg-black/4",
                      )}
                      style={{ color: theme.ink }}
                    >
                      <span className="w-5 font-serif text-[11px]" style={{ color: theme.sub }}>
                        {String(c.index).padStart(2, "0")}
                      </span>
                      <span className="flex-1 truncate">{c.title.replace(/^第.{1,3}章\s*/, "")}</span>
                      {!purchased && c.index > 1 ? (
                        <span className="text-[10px]" style={{ color: theme.sub }}>
                          付费
                        </span>
                      ) : isCurrent ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {!purchased ? (
                <button
                  onClick={() => {
                    setTocOpen(false);
                    setCheckoutOpen(true);
                  }}
                  className="mt-6 w-full rounded-full bg-[#8a2b1e] py-2.5 text-xs text-white"
                >
                  花 ¥{money(book.price)} 解锁全部 {book.chapterCount} 章
                </button>
              ) : null}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* 解锁成功提示 */}
      <AnimatePresence>
        {justUnlocked ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1c1a17] px-5 py-3 text-xs text-[#f7f3ea] shadow-xl"
          >
            <Expand className="h-3.5 w-3.5 text-[#f0d68a]" />
            全书已解锁，被遮住的部分已经展开
            <RotateCcw className="h-3 w-3 opacity-50" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <CheckoutDialog book={book} open={checkoutOpen} onClose={() => setCheckoutOpen(false)} onPaid={handlePaid} />
    </div>
  );
}
