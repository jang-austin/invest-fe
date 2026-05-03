type Props = {
  walletAmount: string;
  onWalletAmountChange: (v: string) => void;
  busy: boolean;
  onDeposit: () => void;
  onWithdraw: () => void;
};

export function WalletCard({
  walletAmount,
  onWalletAmountChange,
  busy,
  onDeposit,
  onWithdraw,
}: Props) {
  return (
    <div className="card">
      <h2>지갑</h2>
      <div className="row">
        <div className="field">
          <label htmlFor="amt">금액 (원)</label>
          <input
            id="amt"
            value={walletAmount}
            onChange={(ev) => onWalletAmountChange(ev.target.value)}
            inputMode="decimal"
            placeholder="예: 1000000"
          />
        </div>
        <button type="button" className="btn btn--primary" onClick={onDeposit} disabled={busy}>
          입금
        </button>
        <button type="button" className="btn btn--danger" onClick={onWithdraw} disabled={busy}>
          출금
        </button>
      </div>
    </div>
  );
}
