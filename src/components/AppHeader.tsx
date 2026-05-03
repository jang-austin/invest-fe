import { formatKRW } from "../utils/format";

type ServerStatus = "checking" | "online" | "offline";

type Props = {
  userProfile: { name: string | null; pictureUrl: string | null } | null;
  userId: string;
  cashBalance: number | null;
  serverStatus: ServerStatus;
  serverStatusLabel: string;
  busy: boolean;
  onRefresh: () => void;
  onLogout: () => void;
};

export function AppHeader({
  userProfile,
  userId,
  cashBalance,
  serverStatus,
  serverStatusLabel,
  busy,
  onRefresh,
  onLogout,
}: Props) {
  return (
    <header className="app__header">
      <div className="row" style={{ gap: "0.6rem", alignItems: "center" }}>
        {userProfile?.pictureUrl && (
          <img src={userProfile.pictureUrl} alt="profile" className="profile-avatar" />
        )}
        <div>
          <h1 className="app__title">Invest</h1>
          <p className="app__meta">
            {userProfile?.name ?? userId} · 현금{" "}
            <span className="mono">{cashBalance == null ? "—" : formatKRW(cashBalance)}</span>
          </p>
        </div>
      </div>
      <div className="row" style={{ gap: "0.75rem" }}>
        <div className="server-indicator">
          <span className={`status-dot status-dot--${serverStatus}`} />
          <span className="app__meta">{serverStatusLabel}</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onRefresh} disabled={busy}>
          새로고침
        </button>
        <button type="button" className="btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
