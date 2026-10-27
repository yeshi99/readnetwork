import { Link } from "react-router-dom";
import { BookOpen, Search, Library, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function SiteHeader({
  query,
  onQuery,
  active = "shelf",
}: {
  query?: string;
  onQuery?: (v: string) => void;
  active?: "shelf" | "mine";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#1c1a17]/10 bg-[#f7f3ea]/85 backdrop-blur-md">
      <div className="container flex h-16 items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[3px] bg-[#1c1a17] text-[#f7f3ea]">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-serif text-lg font-semibold tracking-wide text-[#1c1a17]">
            夜读<span className="text-[#8a6d14]">文库</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {[
            { key: "shelf", to: "/", label: "书架", icon: Sparkles },
            { key: "mine", to: "/mine", label: "我的书房", icon: Library },
          ].map((item) => (
            <Link
              key={item.key}
              to={item.to}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                active === item.key
                  ? "bg-[#1c1a17] text-[#f7f3ea]"
                  : "text-[#4a463f] hover:bg-[#1c1a17]/6",
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {onQuery ? (
            <label className="group flex h-9 items-center gap-2 rounded-full border border-[#1c1a17]/12 bg-white/70 px-3 transition-colors focus-within:border-[#c9a227]/70">
              <Search className="h-3.5 w-3.5 text-[#8a8272]" />
              <input
                value={query ?? ""}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="搜索书名 / 作者 / 标签"
                className="w-28 bg-transparent text-sm outline-none placeholder:text-[#a9a294] focus:w-48 sm:w-40 sm:focus:w-56"
                style={{ transition: "width 200ms ease" }}
              />
            </label>
          ) : null}
          <Link
            to="/mine"
            className="flex items-center gap-2 rounded-full border border-[#1c1a17]/12 bg-white/70 py-1 pl-1 pr-3 text-xs text-[#3a362f] hover:border-[#c9a227]/60"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1c1a17] font-serif text-[11px] text-[#f0d68a]">
              读
            </span>
            林间读者
          </Link>
        </div>
      </div>
    </header>
  );
}
