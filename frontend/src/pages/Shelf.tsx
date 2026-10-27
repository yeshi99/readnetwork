import { Link } from "react-router-dom";
import { BookMarked, Receipt, Clock, ArrowRight, Library } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BookCover } from "@/components/BookCover";
import { money, useMine } from "@/lib/reader-api";

const METHOD_LABEL: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
  card: "银行卡",
};

export default function Shelf() {
  const { data, isLoading } = useMine();
  const books = data?.books ?? [];

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-[#1c1a17]">
      <SiteHeader active="mine" />
      <main className="container py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1c1a17]/10 pb-5">
          <div>
            <p className="text-[11px] tracking-[0.3em] text-[#8a6d14]">MY LIBRARY</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">我的书房</h1>
            <p className="mt-1 text-xs text-[#8a8272]">
              {data?.user.nickname ?? "读者"} · 已拥有 {data?.count ?? 0} 本书
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#1c1a17]/15 px-4 py-2 text-xs hover:border-[#c9a227]"
          >
            去书架选书 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-[#1c1a17]/5" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-[#1c1a17]/6">
              <Library className="h-7 w-7 text-[#8a8272]" />
            </div>
            <h2 className="mt-5 font-serif text-xl">书房还空着</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#8a8272]">
              先去试读一段吧。读到被遮住的那一行时，你会知道该不该把它放进这里。
            </p>
            <Link
              to="/"
              className="mt-6 rounded-full bg-[#1c1a17] px-6 py-2.5 text-sm text-[#f7f3ea]"
            >
              浏览书目
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {books.map((b) => {
              const last = b.lastRead;
              const chapterNo = last ? Number(last.chapterId.replace("c", "")) : 1;
              const pct = Math.round(((chapterNo - 1 + (last?.ratio ?? 0)) / b.chapterCount) * 100);
              return (
                <div
                  key={b.id}
                  className="flex gap-4 rounded-lg border border-[#1c1a17]/8 bg-white/65 p-4 transition-colors hover:border-[#c9a227]/45"
                >
                  <BookCover
                    title={b.title}
                    author={b.author}
                    glyph={b.coverGlyph}
                    from={b.coverFrom}
                    to={b.coverTo}
                    className="h-[150px] w-[106px]"
                    size="sm"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="font-serif text-lg font-semibold">{b.title}</h3>
                    <p className="mt-0.5 text-xs text-[#8a8272]">{b.author} · 全 {b.chapterCount} 章</p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-[#8a8272]">
                        <span className="inline-flex items-center gap-1">
                          <BookMarked className="h-3 w-3" /> 读到第 {chapterNo} 章
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#1c1a17]/8">
                        <div
                          className="h-full rounded-full bg-[#c9a227]"
                          style={{ width: `${Math.max(3, pct)}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-auto pt-3">
                      <Link
                        to={`/read/${b.id}${last ? `?chapter=${last.chapterId}` : ""}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#1c1a17] px-4 py-1.5 text-xs text-[#f7f3ea]"
                      >
                        继续阅读 <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 订单 */}
        {data && data.orders.length > 0 ? (
          <section className="mt-14">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Receipt className="h-4 w-4 text-[#8a6d14]" /> 购买记录
            </h2>
            <div className="mt-3 overflow-hidden rounded-lg border border-[#1c1a17]/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1c1a17]/4 text-[11px] text-[#8a8272]">
                  <tr>
                    <th className="px-4 py-2.5 font-normal">订单号</th>
                    <th className="px-4 py-2.5 font-normal">书目</th>
                    <th className="px-4 py-2.5 font-normal">方式</th>
                    <th className="px-4 py-2.5 font-normal">金额</th>
                    <th className="px-4 py-2.5 font-normal">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((o) => {
                    const book = books.find((b) => b.id === o.bookId);
                    return (
                      <tr key={o.id} className="border-t border-[#1c1a17]/8">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-[#5a5548]">{o.orderNo}</td>
                        <td className="px-4 py-2.5">{book?.title ?? o.bookId}</td>
                        <td className="px-4 py-2.5">{METHOD_LABEL[o.method] ?? o.method}</td>
                        <td className="px-4 py-2.5 font-serif text-[#8a2b1e]">¥{money(o.amount)}</td>
                        <td className="px-4 py-2.5 text-[#8a8272]">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(o.createdAt).toLocaleString("zh-CN", { hour12: false })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
