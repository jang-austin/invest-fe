import type { HoldingInfo } from "../types";
import { formatKRW, formatNum } from "../utils/format";

type Props = {
  holdings: HoldingInfo[];
  selectedSymbol?: string;
  onSelect?: (symbol: string) => void;
};

export function Holdings({ holdings, selectedSymbol, onSelect }: Props) {
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
            <th>평가액</th>
            <th>손익</th>
            <th style={{ opacity: 0.6 }}>평균단가</th>
            <th style={{ opacity: 0.6 }}>현재가</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const pos = h.pnlAmountKrw >= 0;
            const isSelected = h.symbol === selectedSymbol;
            return (
              <tr
                key={h.symbol}
                onClick={() => onSelect?.(h.symbol)}
                style={{
                  cursor: onSelect ? "pointer" : undefined,
                  background: isSelected ? "rgba(37,99,235,0.08)" : undefined,
                }}
              >
                <td className="mono" style={{ fontWeight: isSelected ? 700 : undefined }}>
                  {h.symbol}
                </td>
                <td className="mono">{formatNum(h.quantity)}</td>
                <td className="mono">{formatKRW(h.currentValueKrw)}</td>
                <td className={`mono pnl ${pos ? "pnl--pos" : "pnl--neg"}`}>
                  {pos ? "+" : ""}{formatKRW(h.pnlAmountKrw)}
                  {h.pnlPercent != null && (
                    <span className="pnl__pct">
                      ({pos ? "+" : ""}{h.pnlPercent.toFixed(2)}%)
                    </span>
                  )}
                </td>
                <td className="mono" style={{ opacity: 0.6 }}>{formatKRW(h.averageCostKrw)}</td>
                <td className="mono" style={{ opacity: 0.6 }}>{formatKRW(h.currentPriceKrw)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
