import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import * as api from "./api/investApi";
import type { LedgerEntryResponse, PortfolioResponse, StockQuoteResponse, TransactionType } from "./types";
import { parsePositiveDecimal } from "./util/decimalInput";

const USER_KEY = "invest_user_id";
const DEFAULT_SYMBOL = "AAPL";

const TYPE_LABEL: Record<TransactionType, string> = {
  ADD_MONEY: "입금",
  SUBTRACT_MONEY: "출금",
  BUY: "매수",
  SELL: "매도",
};

const ALL_TYPES: TransactionType[] = ["ADD_MONEY", "SUBTRACT_MONEY", "BUY", "SELL"];

function formatMoney(n: number): string {
  return n.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR");
}

function App() {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(USER_KEY));
  const [loginInput, setLoginInput] = useState("");
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [quoteSymbol, setQuoteSymbol] = useState(DEFAULT_SYMBOL);
  const [quote, setQuote] = useState<StockQuoteResponse | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState(DEFAULT_SYMBOL);
  const [tradeQty, setTradeQty] = useState("1");
  const [walletAmount, setWalletAmount] = useState("10000");
  const [ledgerTypes, setLedgerTypes] = useState<TransactionType[]>([]);
  const [ledger, setLedger] = useState<LedgerEntryResponse[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    const raw = import.meta.env.VITE_API_BASE_URL;
    return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : "http://localhost:8080";
  }, []);

  const clearError = () => setError(null);

  const withBusy = async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    clearError();
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청에 실패했습니다.");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const refreshPortfolio = useCallback(async (uid: string) => {
    const p = await api.getPortfolio(uid);
    setPortfolio(p);
    setCashBalance(p.cashBalance);
  }, []);

  const refreshLedger = useCallback(async (uid: string, types: TransactionType[]) => {
    const rows = await api.getLedger(uid, types.length ? types : undefined);
    setLedger(rows);
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refreshPortfolio(userId).catch(() => {});
    const id = window.setInterval(() => {
      void refreshPortfolio(userId).catch(() => {});
    }, 5000);
    return () => window.clearInterval(id);
  }, [userId, refreshPortfolio]);

  useEffect(() => {
    if (!userId) return;
    void refreshLedger(userId, ledgerTypes).catch(() => {});
  }, [userId, ledgerTypes, refreshLedger]);

  useEffect(() => {
    const sym = quoteSymbol.trim();
    if (!sym) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      void api
        .getQuote(sym)
        .then((q) => {
          if (!cancelled) setQuote(q);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "시세 조회 실패");
        });
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [quoteSymbol]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = loginInput.trim();
    if (!id) {
      setError("ID를 입력하세요.");
      return;
    }
    await withBusy(async () => {
      const u = await api.login(id);
      localStorage.setItem(USER_KEY, u.id);
      setUserId(u.id);
      setCashBalance(u.balance);
      setLoginInput("");
      await refreshPortfolio(u.id);
      await refreshLedger(u.id, ledgerTypes);
    });
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    setUserId(null);
    setCashBalance(null);
    setPortfolio(null);
    setLedger([]);
    setQuote(null);
    clearError();
  };

  const handleBuy = async () => {
    if (!userId) return;
    const qty = parsePositiveDecimal(tradeQty);
    if (!qty) {
      setError("수량은 양의 숫자여야 합니다.");
      return;
    }
    await withBusy(async () => {
      const u = await api.buy(userId, tradeSymbol, qty);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleSell = async () => {
    if (!userId) return;
    const qty = parsePositiveDecimal(tradeQty);
    if (!qty) {
      setError("수량은 양의 숫자여야 합니다.");
      return;
    }
    await withBusy(async () => {
      const u = await api.sell(userId, tradeSymbol, qty);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleDeposit = async () => {
    if (!userId) return;
    const amt = parsePositiveDecimal(walletAmount);
    if (!amt) {
      setError("금액은 양의 숫자여야 합니다.");
      return;
    }
    await withBusy(async () => {
      const u = await api.deposit(userId, amt);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleWithdraw = async () => {
    if (!userId) return;
    const amt = parsePositiveDecimal(walletAmount);
    if (!amt) {
      setError("금액은 양의 숫자여야 합니다.");
      return;
    }
    await withBusy(async () => {
      const u = await api.withdraw(userId, amt);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const toggleLedgerType = (t: TransactionType) => {
    setLedgerTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  if (!userId) {
    return (
      <div className="app">
        <header className="app__header">
          <div>
            <h1 className="app__title">Invest</h1>
            <p className="app__meta">ID만으로 로그인합니다.</p>
          </div>
        </header>
        {error ? <div className="app__banner">{error}</div> : null}
        <div className="card" style={{ maxWidth: 420 }}>
          <h2>로그인</h2>
          <form onSubmit={handleLogin} className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <div className="field" style={{ minWidth: "100%" }}>
              <label htmlFor="userId">사용자 ID</label>
              <input
                id="userId"
                value={loginInput}
                onChange={(ev) => setLoginInput(ev.target.value)}
                autoComplete="username"
                placeholder="예: alice"
              />
            </div>
            <button className="btn btn--primary" type="submit" disabled={busy}>
              시작하기
            </button>
          </form>
          <p className="app__meta" style={{ marginTop: "0.75rem" }}>
            API: <span className="mono">{apiBase}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <h1 className="app__title">Invest</h1>
          <p className="app__meta">
            로그인: <span className="mono">{userId}</span> · 현금{" "}
            <span className="mono">{cashBalance == null ? "—" : formatMoney(cashBalance)}</span>
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn btn--ghost" onClick={() => void refreshPortfolio(userId)} disabled={busy}>
            포트폴리오 새로고침
          </button>
          <button type="button" className="btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      {error ? <div className="app__banner">{error}</div> : null}

      <div className="grid grid--2">
        <div className="card">
          <h2>준실시간 시세</h2>
          <p className="app__meta" style={{ marginTop: "-0.35rem", marginBottom: "0.65rem" }}>
            서버 메모리 캐시 기준으로 3초마다 갱신합니다.
          </p>
          <div className="row">
            <div className="field">
              <label htmlFor="sym">심볼</label>
              <input id="sym" value={quoteSymbol} onChange={(ev) => setQuoteSymbol(ev.target.value.toUpperCase())} />
            </div>
          </div>
          {quote ? (
            <p style={{ marginTop: "0.75rem" }}>
              <span className="mono">{quote.symbol}</span>{" "}
              <strong className="mono">{formatMoney(quote.price)}</strong>
              <span className="app__meta" style={{ marginLeft: "0.5rem" }}>
                {formatWhen(quote.lastUpdated)}
              </span>
            </p>
          ) : quoteSymbol.trim() ? (
            <p className="app__meta" style={{ marginTop: "0.75rem" }}>
              불러오는 중…
            </p>
          ) : (
            <p className="app__meta" style={{ marginTop: "0.75rem" }}>
              심볼을 입력하세요.
            </p>
          )}
        </div>

        <div className="card">
          <h2>포트폴리오</h2>
          {portfolio ? (
            <dl className="mono" style={{ margin: 0, display: "grid", gap: "0.35rem" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>현금</dt>
                <dd style={{ margin: 0 }}>{formatMoney(portfolio.cashBalance)}</dd>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>주식 평가액</dt>
                <dd style={{ margin: 0 }}>{formatMoney(portfolio.stockValue)}</dd>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>합계</dt>
                <dd style={{ margin: 0 }}>
                  <strong>{formatMoney(portfolio.totalValue)}</strong>
                </dd>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>순 수동 입출금</dt>
                <dd style={{ margin: 0 }}>{formatMoney(portfolio.netManualFunding)}</dd>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>수동 입금 대비 손익률</dt>
                <dd style={{ margin: 0 }}>
                  {portfolio.pnlPercentVsFunding == null
                    ? "—"
                    : `${formatMoney(portfolio.pnlPercentVsFunding)}%`}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="app__meta">불러오는 중…</p>
          )}
        </div>

        <div className="card">
          <h2>지갑</h2>
          <div className="row">
            <div className="field">
              <label htmlFor="amt">금액</label>
              <input id="amt" value={walletAmount} onChange={(ev) => setWalletAmount(ev.target.value)} inputMode="decimal" />
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void handleDeposit()} disabled={busy}>
              입금
            </button>
            <button type="button" className="btn btn--danger" onClick={() => void handleWithdraw()} disabled={busy}>
              출금
            </button>
          </div>
        </div>

        <div className="card">
          <h2>매매</h2>
          <div className="row">
            <div className="field">
              <label htmlFor="tsym">심볼</label>
              <input id="tsym" value={tradeSymbol} onChange={(ev) => setTradeSymbol(ev.target.value.toUpperCase())} />
            </div>
            <div className="field">
              <label htmlFor="qty">수량</label>
              <input id="qty" value={tradeQty} onChange={(ev) => setTradeQty(ev.target.value)} inputMode="decimal" />
            </div>
            <button type="button" className="btn btn--primary" onClick={() => void handleBuy()} disabled={busy}>
              매수
            </button>
            <button type="button" className="btn" onClick={() => void handleSell()} disabled={busy}>
              매도
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>거래·입출금 내역</h2>
        <p className="app__meta" style={{ marginTop: "-0.35rem", marginBottom: "0.65rem" }}>
          유형을 하나도 고르지 않으면 전체를 표시합니다. 원하는 유형만 고르면 필터됩니다.
        </p>
        <div className="chips" style={{ marginBottom: "0.75rem" }}>
          {ALL_TYPES.map((t) => (
            <label key={t} className="chip">
              <input type="checkbox" checked={ledgerTypes.includes(t)} onChange={() => toggleLedgerType(t)} />
              {TYPE_LABEL[t]}
            </label>
          ))}
          <button type="button" className="btn btn--ghost" onClick={() => setLedgerTypes([])} disabled={!ledgerTypes.length}>
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
                <th>단가</th>
                <th>현금 변동</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="app__meta">
                    내역이 없습니다.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{formatWhen(row.createdAt)}</td>
                    <td>
                      <span className="pill">{TYPE_LABEL[row.type]}</span>
                    </td>
                    <td className="mono">{row.symbol ?? "—"}</td>
                    <td className="mono">{row.quantity == null ? "—" : formatMoney(row.quantity)}</td>
                    <td className="mono">{row.unitPrice == null ? "—" : formatMoney(row.unitPrice)}</td>
                    <td className="mono">{formatMoney(row.cashDelta)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
