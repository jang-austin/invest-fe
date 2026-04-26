import type { LedgerEntryResponse, TransactionType } from "../types";
import { formatKRW, formatNum, formatWhen } from "../utils/format";

const TYPE_LABEL: Record<TransactionType, string> = {
  ADD_MONEY: "입금",
  SUBTRACT_MONEY: "출금",
  BUY: "매수",
  SELL: "매도",
  DIVIDEND_REINVEST: "배당재투자",
};

const ALL_TYPES: TransactionType[] = ["ADD_MONEY", "SUBTRACT_MONEY", "BUY", "SELL", "DIVIDEND_REINVEST"];

type Props = {
  ledger: LedgerEntryResponse[];
  ledgerTypes: TransactionType[];
  onToggleType: (t: TransactionType) => void;
  onResetFilter: () => void;
};

export function Ledger({ ledger, ledgerTypes, onToggleType, onResetFilter }: Props) {
  return (
    <>
      <p className="app__meta" style={{ marginBottom: "0.65rem" }}>
        유형을 하나도 고르지 않으면 전체를 표시합니다. 원하는 유형만 고르면 필터됩니다.
      </p>
      <div className="chips" style={{ marginBottom: "0.75rem" }}>
        {ALL_TYPES.map((t) => (
          <label key={t} className="chip">
            <input
              type="checkbox"
              checked={ledgerTypes.includes(t)}
              onChange={() => onToggleType(t)}
            />
            {TYPE_LABEL[t]}
          </label>
        ))}
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onResetFilter}
          disabled={!ledgerTypes.length}
        >
          필터 초기화
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>유형</th>
              <th>심볼</th>
              <th>수량</th>
              <th>단가 (원)</th>
              <th>현금 변동 (원)</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={6} className="app__meta">내역이 없습니다.</td>
              </tr>
            ) : (
              ledger.map((row) => (
                <tr key={row.id}>
                  <td className="mono">{formatWhen(row.createdAt)}</td>
                  <td><span className="pill">{TYPE_LABEL[row.type]}</span></td>
                  <td className="mono">{row.symbol ?? "—"}</td>
                  <td className="mono">{row.quantity == null ? "—" : formatNum(row.quantity)}</td>
                  <td className="mono">{row.unitPrice == null ? "—" : formatKRW(row.unitPrice)}</td>
                  <td className="mono">{formatKRW(row.cashDelta)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
