type RateStatus = "loading" | "yahoo" | "manual";

type Props = {
  rateStatus: RateStatus;
  yahooRate: number | null;
  rateInput: string;
  onRateInputChange: (v: string) => void;
  onSetManual: () => void;
  onFetchRate: () => void;
};

export function RateBar({
  rateStatus,
  yahooRate,
  rateInput,
  onRateInputChange,
  onSetManual,
  onFetchRate,
}: Props) {
  return (
    <div className="rate-bar">
      {rateStatus === "loading" && (
        <span className="app__meta">환율 불러오는 중…</span>
      )}
      {rateStatus === "yahoo" && yahooRate != null && (
        <>
          <span className="app__meta">
            환율{" "}
            <span className="mono">₩{yahooRate.toLocaleString("ko-KR")}/$</span>
            <span style={{ marginLeft: "0.3rem" }}>(Yahoo Finance)</span>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onSetManual}>
            수동 설정
          </button>
        </>
      )}
      {rateStatus === "manual" && (
        <>
          <span className="app__meta">
            환율{yahooRate == null ? " (Yahoo 조회 실패)" : " (수동 설정)"}:
          </span>
          <input
            className="mono rate-input"
            value={rateInput}
            onChange={(ev) => onRateInputChange(ev.target.value)}
            inputMode="decimal"
          />
          <span className="app__meta">₩/$</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onFetchRate}>
            Yahoo에서 가져오기
          </button>
        </>
      )}
    </div>
  );
}
