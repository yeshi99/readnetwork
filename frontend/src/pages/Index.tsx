import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronRight, Lock, Star, PlayCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BookCover } from "@/components/BookCover";
import { money, useBooks, useMine, type BookSummary } from "@/lib/reader-api";
import { cn } from "@/lib/utils";

const CARD_COVER_CLASS = "h-[188px] w-[132px]";

function BookCard({ book, index }: { book: BookSummary; index: number }) {
  const progress = book.reading;
  return (
    <Link
      to={`/read/${book.id}`}
      className="group relative flex gap-4 rounded-lg border border-[#1c1a17]/8 bg-white/60 p-4 transition-all hover:-translate-y-1 hover:border-[#c9a227]/50 hover:bg-white hover:shadow-[0_22px_50px_-30px_rgba(28,26,23,0.55)]"
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <BookCover
        title={book.title}
        author={book.author}
        glyph={book.coverGlyph}
        from={book.coverFrom}
        to={book.coverTo}
        className={CARD_COVER_CLASS}
        locked={!book.purchased}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 text-[11px] text-[#8a8272]">
          <span className="rounded-sm bg-[#1c1a17]/6 px-1.5 py-0.5 text-[#5c5648]">{book.category}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-[#c9a227] text-[#c9a227]" />
            {book.rating.toFixed(1)}
          </span>
        </div>
        <h3 className="mt-2 font-serif text-lg font-semibold leading-snug text-[#1c1a17] group-hover:text-[#8a6d14]">
          {book.title}
        </h3>
        <p className="mt-0.5 text-xs text-[#8a8272]">{book.subtitle}</p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-[#5a5548]">{book.intro}</p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-1.5">
            {book.purchased ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3f6b4f]">
                <PlayCircle className="h-3.5 w-3.5" /> 已解锁 · 继续阅读
              </span>
            ) : (
              <>
                <span className="font-serif text-base font-semibold text-[#8a2b1e]">
                  ¥{money(book.price)}
                </span>
                <span className="text-[11px] text-[#a9a294] line-through">
                  ¥{money(book.originalPrice)}
                </span>
                <span className="ml-1 inline-flex items-center gap-0.5 rounded-sm bg-[#8a2b1e]/8 px-1.5 py-0.5 text-[10px] text-[#8a2b1e]">
                  <Lock className="h-2.5 w-2.5" /> 试读 {Math.round(book.previewRatio * 100)}%
                </span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-[#8a8272] group-hover:text-[#8a6d14]">
            {progress ? `读到第 ${progress.chapterId.replace("c", "")} 章` : "开始阅读"}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Index() {
  const [category, setCategory] = useState("全部");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 260);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useBooks(category, debounced);
  const { data: mine } = useMine();

  const featured = data?.books.find((b) => b.id === "bk-001") ?? data?.books[0];
  const lastRead = mine?.books.find((b) => b.lastRead) ?? mine?.books[0];
  const lastReadMeta = lastRead
    ? `${lastRead.chapterCount} 章 · 读至第 ${lastRead.lastRead?.chapterId.replace("c", "") ?? "1"} 章`
    : "";

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#1c1a17]">
      <div
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 12%, rgba(201,162,39,0.10), transparent 42%), radial-gradient(circle at 82% 72%, rgba(138,43,30,0.06), transparent 46%)",
        }}
      />
      <SiteHeader query={query} onQuery={setQuery} active="shelf" />

      <main className="relative">
        {/* HERO */}
        <section className="container pb-10 pt-12">
          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#8a6d14]">
                <span className="h-px w-8 bg-[#c9a227]" /> EDITOR'S SHELF · 二〇二六年 冬
              </p>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.18] tracking-tight text-[#1c1a17] sm:text-[2.9rem]">
                读一段，
                <br />
                <span className="relative inline-block">
                  然后决定要不要读下去
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    height="8"
                    viewBox="0 0 300 8"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M1 5.5C60 2 120 1.5 180 4.5c40 2 80 1 118-2"
                      stroke="#c9a227"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </span>
              </h1>
              <p className="mt-7 max-w-xl text-[15px] leading-[1.95] text-[#5a5548]">
                夜读文库收录了 6 部经编辑逐字校对的原创长篇。每本书都开放一段真实的试读——
                不是节选，不是摘要，就是第一章的开头。读到被截断的那一行，你自然会知道该不该付这笔钱。
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={featured ? `/read/${featured.id}` : "/"}
                  className="group inline-flex items-center gap-2 rounded-full bg-[#1c1a17] px-6 py-3 text-sm text-[#f7f3ea] transition-transform hover:-translate-y-0.5"
                >
                  免费试读《{featured?.title ?? "湖上的月光"}》
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#shelf"
                  className="inline-flex items-center gap-2 rounded-full border border-[#1c1a17]/15 px-6 py-3 text-sm text-[#3a362f] hover:border-[#c9a227]"
                >
                  浏览全部 6 部
                </a>
              </div>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-[#1c1a17]/10 pt-6">
                {[
                  { k: "6", v: "部原创长篇" },
                  { k: "48", v: "章正文" },
                  { k: "9.0", v: "平均评分" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="font-serif text-2xl font-semibold text-[#1c1a17]">{s.k}</dt>
                    <dd className="mt-1 text-[11px] tracking-wide text-[#8a8272]">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 主推书 */}
            {featured ? (
              <div className="relative">
                <div className="absolute -left-6 top-10 hidden -rotate-6 lg:block">
                  <BookCover
                    title={featured.title}
                    author={featured.author}
                    glyph={featured.coverGlyph}
                    from={featured.coverFrom}
                    to={featured.coverTo}
                    className="h-[280px] w-[196px] opacity-25"
                    size="lg"
                  />
                </div>
                <div className="relative mx-auto max-w-[420px] rounded-xl border border-[#1c1a17]/10 bg-white/70 p-6 backdrop-blur">
                  <BookCover
                    title={featured.title}
                    author={featured.author}
                    glyph={featured.coverGlyph}
                    from={featured.coverFrom}
                    to={featured.coverTo}
                    className="mx-auto h-[280px] w-[196px]"
                    size="lg"
                  />
                  <div className="mt-6">
                    <div className="flex items-center gap-2 text-[11px] text-[#8a8272]">
                      <span className="rounded-sm bg-[#c9a227]/15 px-1.5 py-0.5 text-[#8a6d14]">
                        本期主推
                      </span>
                      <span>{featured.category}</span>
                      <span>·</span>
                      <span>{featured.readCount} 人在读</span>
                    </div>
                    <h2 className="mt-2 font-serif text-xl font-semibold">{featured.title}</h2>
                    <p className="mt-1 text-xs text-[#8a8272]">
                      {featured.author} · {featured.totalWords.toLocaleString()} 字 ·{" "}
                      {featured.chapterCount} 章
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-[#1c1a17]/8 pt-4">
                      <div>
                        <div className="font-serif text-xl font-semibold text-[#8a2b1e]">
                          ¥{money(featured.price)}
                        </div>
                        <div className="text-[10px] text-[#a9a294]">
                          原价 ¥{money(featured.originalPrice)} · 可试读{" "}
                          {Math.round(featured.previewRatio * 100)}%
                        </div>
                      </div>
                      <Link
                        to={`/read/${featured.id}`}
                        className="rounded-full bg-[#8a2b1e] px-4 py-2 text-xs text-white hover:bg-[#75241a]"
                      >
                        {featured.purchased ? "继续阅读" : "试读这一段"}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[420px] animate-pulse rounded-xl bg-[#1c1a17]/5" />
            )}
          </div>
        </section>

        {/* 继续阅读 */}
        {lastRead ? (
          <section className="container pb-4">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#c9a227]/35 bg-[#fffdf7] px-5 py-4">
              <span className="text-[11px] tracking-[0.25em] text-[#8a6d14]">继续阅读</span>
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="h-10 w-7 overflow-hidden rounded-[2px]"
                  style={{
                    background: `linear-gradient(150deg, ${lastRead.coverFrom}, ${lastRead.coverTo})`,
                  }}
                />
                <div className="min-w-0">
                  <div className="truncate font-serif text-sm font-semibold">{lastRead.title}</div>
                  <div className="truncate text-[11px] text-[#8a8272]">{lastReadMeta}</div>
                </div>
              </div>
              <Link
                to={`/read/${lastRead.id}${
                  lastRead.lastRead ? `?chapter=${lastRead.lastRead.chapterId}` : ""
                }`}
                className="ml-auto inline-flex items-center gap-1 text-xs text-[#8a2b1e] hover:underline"
              >
                接着读 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </section>
        ) : null}

        {/* 书架 */}
        <section id="shelf" className="container py-10">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1c1a17]/10 pb-4">
            <div>
              <h2 className="font-serif text-2xl font-semibold">全部书目</h2>
              <p className="mt-1 text-xs text-[#8a8272]">
                点击任意一本即可试读；被遮住的部分需要购买后阅读
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(data?.categories ?? ["全部"]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition-colors",
                    category === c
                      ? "bg-[#1c1a17] text-[#f7f3ea]"
                      : "border border-[#1c1a17]/12 text-[#5a5548] hover:border-[#c9a227]",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[220px] animate-pulse rounded-lg bg-[#1c1a17]/5" />
                ))
              : data?.books.map((book, i) => <BookCard key={book.id} book={book} index={i} />)}
          </div>

          {!isLoading && data?.books.length === 0 ? (
            <div className="py-20 text-center text-sm text-[#8a8272]">
              没有找到匹配的书目，换个关键词试试。
            </div>
          ) : null}
        </section>

        {/* 说明 */}
        <section className="container pb-20">
          <div className="grid gap-px overflow-hidden rounded-lg border border-[#1c1a17]/10 bg-[#1c1a17]/10 md:grid-cols-3">
            {[
              { t: "试读即原文", d: "试读部分就是正文原文，不做删减与改写，读到哪儿停就停在哪儿。" },
              { t: "一次购买，永久阅读", d: "单本买断，不设订阅、不设时长限制，重新登录也能找回书架。" },
              { t: "约三分钟完成付款", d: "支持微信、支付宝与银行卡，付款成功后正文即时解锁，无需刷新。" },
            ].map((f) => (
              <div key={f.t} className="bg-[#fbf8f1] p-6">
                <h3 className="font-serif text-base font-semibold">{f.t}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#5a5548]">{f.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#1c1a17]/10 py-8">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#8a8272]">
          <span>© 2026 夜读文库 · 演示项目，支付流程为模拟，不产生真实扣款</span>
          <span className="flex items-center gap-3">
            <span>关于我们</span>
            <span>用户协议</span>
            <span>联系编辑部</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
