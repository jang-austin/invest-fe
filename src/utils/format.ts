export function formatKRW(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₩${Math.abs(Math.round(n)).toLocaleString("ko-KR")}`;
}

export function formatQuotePrice(usd: number, rate: number): string {
  const krw = Math.round(usd * rate).toLocaleString("ko-KR");
  const dollar = usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
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
