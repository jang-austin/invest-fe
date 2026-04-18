import type { HoldingInfo } from "../types";
import { formatKRW, formatNum } from "../utils/format";

type Props = {
  holdings: HoldingInfo[];
};

export function Holdings({ holdings }: Props) {
  if (holdings.length === 0) {
    return <p className="app__meta" style={{ padding: "0.5rem 0" }}>보유 중인 주식이 없습니다.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>심볼</th>
            <th>수량</th>
            <th>평균단가</th>
            <th>현재가</th>
            <th>평가액</th>
            <th>손익</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const pos = h.pnlAmountKrw >= 0;
            return (
              <tr key={h.symbol}>
                <td className="mono">{h.symbol}</td>
                <td className="mono">{formatNum(h.quantity)}</td>
                <td className="mono">{formatKRW(h.averageCostKrw)}</td>
                <td className="mono">{formatKRW(h.currentPriceKrw)}</td>
                <td className="mono">{formatKRW(h.currentValueKrw)}</td>
                <td className={`mono pnl ${pos ? "pnl--pos" : "pnl--neg"}`}>
                  {pos ? "+" : ""}{formatKRW(h.pnlAmountKrw)}
                  {h.pnlPercent != null && (
                    <span className="pnl__pct">
                      ({pos ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
