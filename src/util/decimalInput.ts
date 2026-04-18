/** 양의 실수 문자열을 검증하고 number로 변환. 실패 시 null. */
export function parsePositiveDecimal(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
