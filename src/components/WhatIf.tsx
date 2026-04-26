import { useState } from "react";
import * as api from "../api/investApi";
import type { WhatIfResponse } from "../types";
import { formatKRW, formatNum } from "../utils/format";

const PRESETS = ["QQQ", "VOO", "SPY", "VTI"];

type Props = { userId: string };

export function WhatIf({ userId }: Props) {
  const [symbol, setSymbol] = useState("QQQ");
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (sym: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.getWhatIf(userId, sym);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const pos = result && result.returnAmountKrw >= 0;

  return (
    <div>
      <p className="app__meta" style={{ marginBottom: "0.75rem" }}>
        내 입금 내역 그대로 해당 종목에 투자했다면?
        <span style={{ marginLeft: "0.35rem", opacity: 0.7, fontSize: "0.78rem" }}>
          (현재 환율 기준)
        </span>
      </p>
      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        {PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            className={`btn btn--ghost btn--sm${symbol === s ? " mode-btn--active" : ""}`}
            onClick={() => setSymbol(s)}
          >
            {s}
          </button>
        ))}
        <input
          className="mono rate-input"
          style={{ width: 72 }}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="직접입력"
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => void run(symbol)}
          disabled={loading || !symbol}
        >
          {loading ? "계산 중…" : "계산"}
        </button>
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{error}</p>}

      {result && result.totalDepositedKrw > 0 && (
        <dl className="mono" style={{ margin: 0, display: "grid", gap: "0.35rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt className="app__meta">총 투자 원금</dt>
            <dd style={{ margin: 0 }}>{formatKRW(result.totalDepositedKrw)}</dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt className="app__meta">{result.symbol} 현재 가치</dt>
            <dd style={{ margin: 0 }}>{formatKRW(result.currentValueKrw)}</dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt className="app__meta">손익</dt>
            <dd style={{ margin: 0 }} className={pos ? "pnl--pos" : "pnl--neg"}>
              {pos ? "+" : ""}{formatKRW(result.returnAmountKrw)}
              {result.returnPercent != null && (
                <span className="pnl__pct">
                  ({pos ? "+" : ""}{formatNum(result.returnPercent)}%)
                </span>
              )}
            </dd>
          </div>
          {result.actualReturnPercent != null && (
            <div className="row" style={{ justifyContent: "space-between", marginTop: "0.25rem", paddingTop: "0.35rem", borderTop: "1px solid #e2e8f0" }}>
              <dt className="app__meta">내 실제 수익률</dt>
              <dd style={{ margin: 0 }} className={result.actualReturnPercent >= 0 ? "pnl--pos" : "pnl--neg"}>
                {result.actualReturnPercent >= 0 ? "+" : ""}{formatNum(result.actualReturnPercent)}%
              </dd>
            </div>
          )}
        </dl>
      )}

      {result && result.totalDepositedKrw === 0 && (
        <p className="app__meta">입금 내역이 없습니다.</p>
      )}
    </div>
  );
}
