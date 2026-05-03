import type { PortfolioResponse } from "../types";
import { formatKRW, formatNum, pnlClass } from "../utils/format";
import { WhatIf } from "./WhatIf";

type Props = {
  portfolio: PortfolioResponse | null;
  userId: string;
};

export function PortfolioCard({ portfolio, userId }: Props) {
  return (
    <div className="card">
      <h2>포트폴리오</h2>
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
          <div
            className="row"
            style={{ justifyContent: "space-between" }}
          >
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
