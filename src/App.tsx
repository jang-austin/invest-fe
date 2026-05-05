import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import * as api from "./api/investApi";
import { AppHeader } from "./components/AppHeader";
import { Holdings } from "./components/Holdings";
import { Ledger } from "./components/Ledger";
import { PortfolioCard } from "./components/PortfolioCard";
import { RateBar } from "./components/RateBar";
import { TradeCard } from "./components/TradeCard";
import { WalletCard } from "./components/WalletCard";
import type {
  HoldingInfo,
  LedgerEntryResponse,
  PortfolioResponse,
  StockQuoteResponse,
  TransactionType,
} from "./types";
import { parsePositiveDecimal } from "./util/decimalInput";

const USER_KEY = "invest_user_id";
const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_RATE = 1500;

type RateStatus = "loading" | "yahoo" | "manual";
type Tab = "holdings" | "ledger";
type ServerStatus = "checking" | "online" | "offline";

function App() {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(USER_KEY));
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    email: string | null;
    pictureUrl: string | null;
  } | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const tradeCardRef = useRef<HTMLDivElement>(null);

  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOL);
  const [quote, setQuote] = useState<StockQuoteResponse | null>(null);
  const [walletAmount, setWalletAmount] = useState("1000000");
  const [ledgerTypes, setLedgerTypes] = useState<TransactionType[]>([]);
  const [ledger, setLedger] = useState<LedgerEntryResponse[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("holdings");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [yahooRate, setYahooRate] = useState<number | null>(null);
  const [rateInput, setRateInput] = useState(String(DEFAULT_RATE));
  const [rateStatus, setRateStatus] = useState<RateStatus>("loading");

  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const serverStatusRef = useRef<ServerStatus>("checking");
  serverStatusRef.current = serverStatus;
  const wasOfflineRef = useRef(false);
  const [gsiReady, setGsiReady] = useState(false);

  const rate: number =
    rateStatus === "yahoo" && yahooRate != null ? yahooRate : parseFloat(rateInput) || DEFAULT_RATE;

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

  // ── 서버 헬스체크 ──
  const checkHealth = useCallback(async () => {
    try {
      const ok = await api.checkHealth();
      if (ok) {
        setServerStatus("online");
        wasOfflineRef.current = false;
      } else {
        wasOfflineRef.current = true;
        setServerStatus("offline");
      }
      return ok;
    } catch {
      wasOfflineRef.current = true;
      setServerStatus("offline");
      return false;
    }
  }, []);

  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isRunning = false;
    let isMounted = true;
    const poll = async () => {
      if (!isMounted || isRunning) return;
      isRunning = true;
      try {
        const ok = await checkHealth();
        timerId = setTimeout(poll, ok ? 30000 : 5000);
      } finally {
        isRunning = false;
      }
    };
    poll();
    return () => { isMounted = false; if (timerId) clearTimeout(timerId); };
  }, [checkHealth]);

  // ── 환율 ──
  const fetchRate = useCallback(async () => {
    try {
      const q = await api.getQuote("KRW=X");
      if (q?.price && q.price > 100) {
        setYahooRate(q.price);
        setRateStatus("yahoo");
        return;
      }
    } catch { /* fall through */ }
    setRateStatus((prev) => (prev === "loading" ? "manual" : prev));
  }, []);

  useEffect(() => {
    void fetchRate();
    const id = window.setInterval(() => void fetchRate(), 60_000);
    return () => window.clearInterval(id);
  }, [fetchRate]);

  // ── 시세 폴링 ──
  useEffect(() => {
    const sym = symbol.trim();
    if (!sym) { setQuote(null); return; }
    let cancelled = false;
    const tick = () => {
      void api.getQuote(sym)
        .then((q) => { if (!cancelled) setQuote(q); })
        .catch((e: unknown) => { if (!cancelled) setError(e instanceof Error ? e.message : "시세 조회 실패"); });
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [symbol]);

  // ── 데이터 갱신 ──
  const refreshHoldings = useCallback(async (uid: string) => {
    setHoldings(await api.getHoldings(uid));
  }, []);

  const refreshPortfolio = useCallback(async (uid: string) => {
    const p = await api.getPortfolio(uid);
    setPortfolio(p);
    setCashBalance(p.cashBalance);
    await refreshHoldings(uid);
  }, [refreshHoldings]);

  const refreshLedger = useCallback(async (uid: string, types: TransactionType[]) => {
    setLedger(await api.getLedger(uid, types.length ? types : undefined));
  }, []);

  useEffect(() => {
    if (!userId) return;
    void refreshPortfolio(userId).catch(() => {});
    const id = window.setInterval(() => void refreshPortfolio(userId).catch(() => {}), 5000);
    return () => window.clearInterval(id);
  }, [userId, refreshPortfolio]);

  useEffect(() => {
    if (!userId) return;
    void refreshLedger(userId, ledgerTypes).catch(() => {});
  }, [userId, ledgerTypes, refreshLedger]);

  // ── Google 로그인 ──
  const handleGoogleCredential = useCallback(async (credential: string) => {
    await withBusy(async () => {
      const u = await api.googleLogin(credential);
      localStorage.setItem(USER_KEY, u.id);
      setUserId(u.id);
      setCashBalance(u.balance);
      setUserProfile({ name: u.name, email: u.email, pictureUrl: u.pictureUrl });
      await refreshPortfolio(u.id);
      await refreshLedger(u.id, ledgerTypes);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerTypes, refreshPortfolio, refreshLedger]);

  useEffect(() => {
    if (userId) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;
    if (window.google?.accounts?.id) { setGsiReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [userId]);

  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => void handleGoogleCredential(res.credential),
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline", size: "large", width: 280, locale: "ko",
    });
  }, [gsiReady, handleGoogleCredential]);

  const handleLogout = () => {
    if (userId && window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    localStorage.removeItem(USER_KEY);
    setUserId(null); setUserProfile(null); setCashBalance(null);
    setPortfolio(null); setHoldings([]); setLedger([]); setQuote(null);
    clearError();
  };

  // ── 매매 ──
  const currentHolding = holdings.find((h) => h.symbol === symbol) ?? null;

  const handleBuy = async (qty: number) => {
    if (!userId) return;
    await withBusy(async () => {
      const u = await api.buy(userId, symbol, qty);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleSell = async (qty: number) => {
    if (!userId) return;
    await withBusy(async () => {
      const u = await api.sell(userId, symbol, qty);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleSellAll = async () => {
    if (!userId || !currentHolding) return;
    await withBusy(async () => {
      const u = await api.sell(userId, symbol, currentHolding.quantity);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleRoundUp = async () => {
    if (!userId || !currentHolding) return;
    const frac = currentHolding.quantity % 1;
    if (frac < 0.000001) return;
    await withBusy(async () => {
      const u = await api.buy(userId, symbol, parseFloat((1 - frac).toFixed(8)));
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleRoundDown = async () => {
    if (!userId || !currentHolding) return;
    const frac = currentHolding.quantity % 1;
    if (frac < 0.000001) return;
    await withBusy(async () => {
      const u = await api.sell(userId, symbol, parseFloat(frac.toFixed(8)));
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  // ── 지갑 ──
  const handleDeposit = async () => {
    if (!userId) return;
    const amt = parsePositiveDecimal(walletAmount);
    if (!amt) { setError("금액은 양의 숫자여야 합니다."); return; }
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
    if (!amt) { setError("금액은 양의 숫자여야 합니다."); return; }
    await withBusy(async () => {
      const u = await api.withdraw(userId, amt);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleSelectHolding = (sym: string) => {
    setSymbol(sym);
    setSymbolInput(sym);
    tradeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleLedgerType = (t: TransactionType) =>
    setLedgerTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const serverStatusLabel =
    serverStatus === "online" ? "연결됨"
    : serverStatus === "offline" ? (wasOfflineRef.current ? "깨우는 중…" : "오프라인")
    : "확인 중";

  // ── 로그인 화면 ──
  if (!userId) {
    return (
      <div className="app">
        <header className="app__header">
          <div><h1 className="app__title">Invest</h1></div>
          <div className="server-indicator">
            <span className={`status-dot status-dot--${serverStatus}`} />
            <span className="app__meta">{serverStatusLabel}</span>
          </div>
        </header>
        {error && <div className="app__banner">{error}</div>}
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>로그인</h2>
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <p className="app__meta" style={{ color: "#dc2626" }}>
              VITE_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.
            </p>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={googleBtnRef} />
            </div>
          )}
          {serverStatus !== "online" && (
            <p className="app__meta" style={{ marginTop: "0.75rem" }}>
              {serverStatus === "offline" ? "⚠ 서버 연결 대기 중 — 로그인 후 잠시 기다려주세요" : "서버 확인 중…"}
            </p>
          )}
          {busy && <p className="app__meta" style={{ marginTop: "0.5rem" }}>로그인 중…</p>}
        </div>
      </div>
    );
  }

  // ── 메인 화면 ──
  return (
    <div className="app">
      <AppHeader
        userProfile={userProfile}
        userId={userId}
        cashBalance={cashBalance}
        serverStatus={serverStatus}
        serverStatusLabel={serverStatusLabel}
        busy={busy}
        onRefresh={() => void refreshPortfolio(userId)}
        onLogout={handleLogout}
      />

      <RateBar
        rateStatus={rateStatus}
        yahooRate={yahooRate}
        rateInput={rateInput}
        onRateInputChange={setRateInput}
        onSetManual={() => setRateStatus("manual")}
        onFetchRate={() => void fetchRate()}
      />

      {error && <div className="app__banner">{error}</div>}

      <div className="grid grid--2">
        <TradeCard
          symbol={symbol}
          symbolInput={symbolInput}
          onSymbolInputChange={setSymbolInput}
          onSymbolConfirm={(sym) => { setSymbol(sym); setSymbolInput(sym); }}
          quote={quote}
          cashBalance={cashBalance}
          rate={rate}
          currentHolding={currentHolding}
          busy={busy}
          cardRef={tradeCardRef}
          onBuy={handleBuy}
          onSell={handleSell}
          onSellAll={() => void handleSellAll()}
          onRoundUp={() => void handleRoundUp()}
          onRoundDown={() => void handleRoundDown()}
          onError={setError}
        />

        <PortfolioCard portfolio={portfolio} userId={userId} holdings={holdings} />

        <WalletCard
          walletAmount={walletAmount}
          onWalletAmountChange={setWalletAmount}
          busy={busy}
          onDeposit={() => void handleDeposit()}
          onWithdraw={() => void handleWithdraw()}
        />
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn${activeTab === "holdings" ? " tab-btn--active" : ""}`}
            onClick={() => setActiveTab("holdings")}
          >
            보유 주식
            {holdings.length > 0 && <span className="tab-badge">{holdings.length}</span>}
          </button>
          <button
            type="button"
            className={`tab-btn${activeTab === "ledger" ? " tab-btn--active" : ""}`}
            onClick={() => {
              setActiveTab("ledger");
              if (userId) void refreshLedger(userId, ledgerTypes).catch(() => {});
            }}
          >
            거래·입출금 내역
          </button>
        </div>
        <div style={{ paddingTop: "0.75rem" }}>
          {activeTab === "holdings" && (
            <Holdings holdings={holdings} selectedSymbol={symbol} onSelect={handleSelectHolding} />
          )}
          {activeTab === "ledger" && (
            <Ledger
              ledger={ledger}
              ledgerTypes={ledgerTypes}
              onToggleType={toggleLedgerType}
              onResetFilter={() => setLedgerTypes([])}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
