import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 书籍封面：纯 CSS 生成的排版封面，无外链图片依赖 */
export function BookCover({
  title,
  author,
  glyph,
  from,
  to,
  className,
  size = "md",
  locked,
}: {
  title: string;
  author: string;
  glyph: string;
  from: string;
  to: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  locked?: boolean;
}) {
  const titleSize = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[3px] shrink-0 select-none",
        "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.65)]",
        className,
      )}
      style={{ background: `linear-gradient(150deg, ${from} 0%, ${to} 82%)` }}
    >
      {/* 书脊 */}
      <div className="absolute inset-y-0 left-0 w-[9px] bg-black/25" />
      <div className="absolute inset-y-0 left-[9px] w-px bg-white/25" />
      {/* 烫金细框 */}
      <div className="absolute inset-[10px] left-[18px] border border-white/20 rounded-[2px]" />
      <div className="absolute inset-[13px] left-[21px] border border-white/10 rounded-[1px]" />
      {/* 巨型字 */}
      <span
        className="absolute right-2 bottom-1 font-serif leading-none text-white/[0.07]"
        style={{ fontSize: size === "lg" ? "7rem" : size === "sm" ? "3.2rem" : "4.6rem" }}
      >
        {glyph}
      </span>
      <div className="relative flex h-full flex-col justify-between p-3 pl-5">
        <div className="flex items-center justify-between">
          <span className="font-serif text-[9px] tracking-[0.35em] text-white/55">夜读文库</span>
          {locked ? (
            <span className="rounded-sm bg-black/35 px-1.5 py-0.5 text-[9px] tracking-widest text-white/70">
              付费
            </span>
          ) : null}
        </div>
        <div>
          <div className={cn("font-serif font-semibold leading-snug text-white/95", titleSize)}>
            {title}
          </div>
          <div className="mt-1.5 h-px w-8 bg-[#c9a227]/80" />
          <div className="mt-1.5 text-[10px] tracking-[0.2em] text-white/55">{author}</div>
        </div>
      </div>
    </div>
  );
}

/** 章节解锁进度条 */
export function ProgressPill({ label, tone = "gold" }: { label: ReactNode; tone?: "gold" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone === "gold"
          ? "border-[#c9a227]/40 bg-[#c9a227]/10 text-[#8a6d14]"
          : "border-border bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
