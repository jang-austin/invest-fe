export function formatKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString("ko-KR")}`;
}

/** 부호 포함 등락 표시. currency=KRW면 원화, 아니면 달러 기준 */
export function formatChange(change: number, changePct: number, currency?: string | null): string {
  const sign = change >= 0 ? "+" : "";
  const pct = `${sign}${changePct.toFixed(2)}%`;
  if (currency === "KRW") {
    return `${sign}${Math.round(change).toLocaleString("ko-KR")} (${pct})`;
  }
  const dollar = change.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `${sign}$${dollar} (${pct})`;
}

/** 수익률 표시용 색상 CSS 클래스 (한국 증시 관례: 상승=빨강, 하락=파랑) */
export function pnlClass(value: number): string {
  if (value > 0) return "pnl--pos";
  if (value < 0) return "pnl--neg";
  return "";
}

export function formatQuotePrice(price: number, rate: number, currency?: string | null): string {
  if (currency === "KRW") {
    return `₩${Math.round(price).toLocaleString("ko-KR")}`;
  }
  const krw = Math.round(price * rate).toLocaleString("ko-KR");
  const dollar = price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `₩${krw} ($${dollar})`;
}

export function formatNum(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
}
