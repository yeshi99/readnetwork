import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CreditCard, Lock, ShieldCheck, X, Sparkles } from "lucide-react";
import { money, purchaseBook, type BookDetail, type PayMethod } from "@/lib/reader-api";
import { cn } from "@/lib/utils";

const METHODS: { key: PayMethod; label: string; hint: string; color: string; glyph: string }[] = [
  { key: "wechat", label: "微信支付", hint: "推荐 · 扫码即时到账", color: "#2e9e58", glyph: "微" },
  { key: "alipay", label: "支付宝", hint: "支持花呗分期", color: "#1677ff", glyph: "支" },
  { key: "card", label: "银行卡", hint: "储蓄卡 / 信用卡", color: "#5b5245", glyph: "卡" },
];

type Stage = "form" | "paying" | "done";

export function CheckoutDialog({
  book,
  open,
  onClose,
  onPaid,
}: {
  book: BookDetail;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [method, setMethod] = useState<PayMethod>("wechat");
  const [stage, setStage] = useState<Stage>("form");
  const [orderNo, setOrderNo] = useState("");
  const [error, setError] = useState("");

  const discount = book.originalPrice - book.price;
  const total = book.price;

  const wordsSaved = useMemo(
    () => Math.round(book.totalWords * (1 - book.previewRatio)),
    [book],
  );

  const submit = async () => {
    setError("");
    setStage("paying");
    try {
      const res = await purchaseBook(book.id, method);
      setOrderNo(res.order?.orderNo ?? "");
      setStage("done");
      setTimeout(() => onPaid(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "支付失败，请稍后重试");
      setStage("form");
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0d0c0a]/55 p-4 backdrop-blur-sm"
          onClick={() => stage !== "paying" && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-[#fdfbf6] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部 */}
            <div className="flex items-start justify-between border-b border-[#1c1a17]/8 px-6 pb-4 pt-5">
              <div>
                <div className="text-[11px] tracking-[0.25em] text-[#8a6d14]">SINGLE PURCHASE</div>
                <h3 className="mt-1 font-serif text-xl font-semibold text-[#1c1a17]">
                  解锁《{book.title}》全书
                </h3>
              </div>
              <button
                onClick={onClose}
                disabled={stage === "paying"}
                className="rounded-full p-1.5 text-[#8a8272] transition-colors hover:bg-[#1c1a17]/6 disabled:opacity-40"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {stage === "done" ? (
              <div className="px-6 py-10 text-center">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#2e9e58] text-white"
                >
                  <Check className="h-8 w-8" strokeWidth={3} />
                </motion.div>
                <h4 className="mt-5 font-serif text-lg font-semibold">支付成功，已解锁全书</h4>
                <p className="mt-2 text-xs text-[#8a8272]">
                  订单号 {orderNo} · 正在为你展开被遮住的部分…
                </p>
                <div className="mx-auto mt-5 h-1 w-40 overflow-hidden rounded-full bg-[#1c1a17]/8">
                  <div className="gold-shimmer h-full w-full" />
                </div>
              </div>
            ) : (
              <>
                {/* 订单摘要 */}
                <div className="px-6 pt-4">
                  <div className="rounded-xl border border-[#1c1a17]/10 bg-white px-4 py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#5a5548]">{book.title}（全 {book.chapterCount} 章）</span>
                      <span className="font-serif text-[#1c1a17]">¥{money(book.originalPrice)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-[#8a6d14]">
                        <Sparkles className="h-3.5 w-3.5" /> 限时特价
                      </span>
                      <span className="text-[#8a6d14]">-¥{money(discount)}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-dashed border-[#1c1a17]/12 pt-3">
                      <span className="text-xs text-[#8a8272]">
                        解锁 {wordsSaved.toLocaleString()} 字正文 · 永久可读
                      </span>
                      <span className="font-serif text-2xl font-semibold text-[#8a2b1e]">
                        ¥{money(total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 支付方式 */}
                <div className="px-6 pt-5">
                  <div className="mb-2 text-xs text-[#8a8272]">选择支付方式</div>
                  <div className="space-y-2">
                    {METHODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setMethod(m.key)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                          method === m.key
                            ? "border-[#c9a227] bg-[#c9a227]/8 shadow-[0_0_0_3px_rgba(201,162,39,0.12)]"
                            : "border-[#1c1a17]/10 bg-white hover:border-[#1c1a17]/25",
                        )}
                      >
                        <span
                          className="grid h-8 w-8 place-items-center rounded-md font-serif text-sm text-white"
                          style={{ background: m.color }}
                        >
                          {m.glyph}
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm text-[#1c1a17]">{m.label}</span>
                          <span className="block text-[11px] text-[#8a8272]">{m.hint}</span>
                        </span>
                        <span
                          className={cn(
                            "grid h-4 w-4 place-items-center rounded-full border",
                            method === m.key
                              ? "border-[#c9a227] bg-[#c9a227]"
                              : "border-[#c9a227]/40",
                          )}
                        >
                          {method === m.key ? <Check className="h-2.5 w-2.5 text-white" /> : null}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {error ? (
                  <p className="mt-3 px-6 text-xs text-[#8a2b1e]">{error}</p>
                ) : null}

                <div className="px-6 pb-6 pt-5">
                  <button
                    onClick={submit}
                    disabled={stage === "paying"}
                    className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[#8a2b1e] py-3 text-sm font-medium text-white transition-colors hover:bg-[#75241a] disabled:cursor-wait disabled:opacity-90"
                  >
                    {stage === "paying" ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        正在确认支付…
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5" />
                        确认支付 ¥{money(total)}
                      </>
                    )}
                  </button>
                  <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-[#a9a294]">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> 演示环境 · 模拟支付
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CreditCard className="h-3 w-3" /> 不会产生真实扣款
                    </span>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
