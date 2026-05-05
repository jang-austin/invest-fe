import { useState } from "react";
import * as api from "../api/investApi";
import type { PortfolioResponse } from "../types";
import { formatKRW, formatNum, pnlClass } from "../utils/format";
import { WhatIf } from "./WhatIf";

type Props = {
  portfolio: PortfolioResponse | null;
  userId: string;
};

export function PortfolioCard({ portfolio, userId }: Props) {
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopyAdvisorContext() {
    setCopying(true);
    try {
      const ctx = await api.getAdvisorContext(userId);
      const text = JSON.stringify(ctx, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert("컨텍스트 복사 실패");
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>포트폴리오</h2>
        <button
          onClick={handleCopyAdvisorContext}
          disabled={copying || !userId}
          style={{
            fontSize: "0.78rem",
            padding: "0.3rem 0.65rem",
            background: copied ? "#16a34a" : undefined,
            color: copied ? "#fff" : undefined,
            borderRadius: "6px",
            cursor: copying ? "wait" : "pointer",
          }}
        >
          {copying ? "로딩…" : copied ? "✓ 복사됨" : "📋 AI 조언 컨텍스트 복사"}
        </button>
      </div>
      {portfolio ? (
        <dl className="mono" style={{ margin: 0, display: "grid", gap: "0.35rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>현금</dt>
            <dd style={{ margin: 0 }}>{formatKRW(portfolio.cashBalance)}</dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>주식 평가액</dt>
            <dd style={{ margin: 0 }}>{formatKRW(portfolio.stockValue)}</dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>합계</dt>
            <dd style={{ margin: 0 }}>
              <strong>{formatKRW(portfolio.totalValue)}</strong>
            </dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>순 수동 입출금</dt>
            <dd style={{ margin: 0 }}>{formatKRW(portfolio.netManualFunding)}</dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>손익금액</dt>
            <dd
              style={{ margin: 0 }}
              className={portfolio.pnlAmountVsFunding != null ? pnlClass(portfolio.pnlAmountVsFunding) : ""}
            >
              {portfolio.pnlAmountVsFunding == null
                ? "—"
                : `${portfolio.pnlAmountVsFunding >= 0 ? "+" : ""}${formatKRW(portfolio.pnlAmountVsFunding)}`}
            </dd>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <dt>손익률</dt>
            <dd
              style={{ margin: 0 }}
              className={portfolio.pnlPercentVsFunding != null ? pnlClass(portfolio.pnlPercentVsFunding) : ""}
            >
              {portfolio.pnlPercentVsFunding == null
                ? "—"
                : `${portfolio.pnlPercentVsFunding >= 0 ? "+" : ""}${formatNum(portfolio.pnlPercentVsFunding)}%`}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="app__meta">불러오는 중…</p>
      )}
      <hr style={{ margin: "1rem 0", opacity: 0.2 }} />
      <h3 style={{ marginBottom: "0.5rem", fontSize: "0.95rem" }}>만약에 계산기</h3>
      <WhatIf userId={userId} />
    </div>
  );
}
