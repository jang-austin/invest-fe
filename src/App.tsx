import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import * as api from "./api/investApi";
import { Holdings } from "./components/Holdings";
import { Ledger } from "./components/Ledger";
import type {
  HoldingInfo,
  LedgerEntryResponse,
  PortfolioResponse,
  StockQuoteResponse,
  StockSearchResult,
  TransactionType,
} from "./types";
import {
  formatKRW,
  formatNum,
  formatQuotePrice,
  formatWhen,
} from "./utils/format";
import { parsePositiveDecimal } from "./util/decimalInput";

const USER_KEY = "invest_user_id";
const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_RATE = 1500;

type RateStatus = "loading" | "yahoo" | "manual";
type Tab = "holdings" | "ledger";
type ServerStatus = "checking" | "online" | "offline";
type TradeMode = "qty" | "amount";

function App() {
  const [userId, setUserId] = useState<string | null>(() =>
    localStorage.getItem(USER_KEY)
  );
  const [userProfile, setUserProfile] = useState<{
    name: string | null;
    email: string | null;
    pictureUrl: string | null;
  } | null>(null);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [holdings, setHoldings] = useState<HoldingInfo[]>([]);
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);       // 확정된 심볼 (시세 조회용)
  const [symbolInput, setSymbolInput] = useState(DEFAULT_SYMBOL); // 입력 중인 텍스트 (검색용)
  const [quote, setQuote] = useState<StockQuoteResponse | null>(null);
  const [tradeMode, setTradeMode] = useState<TradeMode>("qty");
  const [tradeQty, setTradeQty] = useState("1");
  const [tradeAmount, setTradeAmount] = useState("");
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

  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);


  const rate: number =
    rateStatus === "yahoo" && yahooRate != null
      ? yahooRate
      : parseFloat(rateInput) || DEFAULT_RATE;

  // 금액 모드에서 계산된 수량
  const amountQty = useMemo(() => {
    if (tradeMode !== "amount" || !quote) return null;
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0) return null;
    const priceKrw = quote.price * rate;
    if (priceKrw <= 0) return null;
    return amt / priceKrw;
  }, [tradeMode, tradeAmount, quote, rate]);
  const checkHealth = useCallback(async () => {
    try {
      const ok = await api.checkHealth();
      const prev = serverStatusRef.current;

      if (ok) {
        setServerStatus("online");
        if (prev === "offline" || prev === "checking") {
          wasOfflineRef.current = false;
        }
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
        const delay = ok ? 30000 : 5000;

        timerId = setTimeout(poll, delay);
      } finally {
        isRunning = false;
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [checkHealth]);

  // 환율
  const fetchRate = useCallback(async () => {
    try {
      const q = await api.getQuote("KRW=X");
      if (q?.price && q.price > 100) {
        setYahooRate(q.price);
        setRateStatus("yahoo");
        return;
      }
    } catch {
      // fall through
    }
    setRateStatus((prev) => (prev === "loading" ? "manual" : prev));
  }, []);

  useEffect(() => {
    void fetchRate();
    const id = window.setInterval(() => void fetchRate(), 60_000);
    return () => window.clearInterval(id);
  }, [fetchRate]);

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

  const refreshHoldings = useCallback(async (uid: string) => {
    const h = await api.getHoldings(uid);
    setHoldings(h);
  }, []);

  const refreshPortfolio = useCallback(
    async (uid: string) => {
      const p = await api.getPortfolio(uid);
      setPortfolio(p);
      setCashBalance(p.cashBalance);
      await refreshHoldings(uid);
    },
    [refreshHoldings]
  );

  const refreshLedger = useCallback(
    async (uid: string, types: TransactionType[]) => {
      const rows = await api.getLedger(uid, types.length ? types : undefined);
      setLedger(rows);
    },
    []
  );

  useEffect(() => {
    if (!userId) return;
    void refreshPortfolio(userId).catch(() => {});
    const id = window.setInterval(
      () => void refreshPortfolio(userId).catch(() => {}),
      5000
    );
    return () => window.clearInterval(id);
  }, [userId, refreshPortfolio]);

  useEffect(() => {
    if (!userId) return;
    void refreshLedger(userId, ledgerTypes).catch(() => {});
  }, [userId, ledgerTypes, refreshLedger]);

  // 심볼 입력 디바운스 검색 (symbolInput 기준 — 한글 포함)
  useEffect(() => {
    const q = symbolInput.trim();
    if (q.length < 1) { setSearchResults([]); setSearchOpen(false); return; }
    const id = setTimeout(() => {
      void api.searchStocks(q).then((r) => {
        setSearchResults(r);
        setSearchOpen(r.length > 0);
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [symbolInput]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const sym = symbol.trim();
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
          if (!cancelled)
            setError(e instanceof Error ? e.message : "시세 조회 실패");
        });
    };
    tick();
    const id = window.setInterval(tick, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [symbol]);

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

  // 1단계: GIS 스크립트 로드
  useEffect(() => {
    if (userId) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    // 이미 로드된 경우 (캐시 등)
    if (window.google?.accounts?.id) { setGsiReady(true); return; }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => setGsiReady(true);
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [userId]);

  // 2단계: 스크립트 준비 + ref 마운트 후 버튼 렌더링
  useEffect(() => {
    if (!gsiReady || !googleBtnRef.current) return;
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (res) => void handleGoogleCredential(res.credential),
    });
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      width: 280,
      locale: "ko",
    });
  }, [gsiReady, handleGoogleCredential]);

  const handleLogout = () => {
    if (userId && window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem(USER_KEY);
    setUserId(null);
    setUserProfile(null);
    setCashBalance(null);
    setPortfolio(null);
    setHoldings([]);
    setLedger([]);
    setQuote(null);
    clearError();
  };

  const resolveTradeQty = (): number | null => {
    if (tradeMode === "qty") {
      return parsePositiveDecimal(tradeQty);
    }
    return amountQty;
  };

  const handleBuy = async () => {
    if (!userId) return;
    const qty = resolveTradeQty();
    if (!qty) {
      setError(
        tradeMode === "qty"
          ? "수량은 양의 숫자여야 합니다."
          : "금액을 입력하세요."
      );
      return;
    }
    await withBusy(async () => {
      const u = await api.buy(userId, symbol, qty, rate);
      setCashBalance(u.balance);
      await refreshPortfolio(userId);
      await refreshLedger(userId, ledgerTypes);
    });
  };

  const handleSell = async () => {
    if (!userId) return;
    const qty = resolveTradeQty();
    if (!qty) {
      setError(
        tradeMode === "qty"
          ? "수량은 양의 숫자여야 합니다."
          : "금액을 입력하세요."
      );
      return;
    }
    await withBusy(async () => {
      const u = await api.sell(userId, symbol, qty, rate);
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

  const toggleLedgerType = (t: TransactionType) =>
    setLedgerTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );

  const serverStatusLabel =
    serverStatus === "online"
      ? "연결됨"
      : serverStatus === "offline"
      ? wasOfflineRef.current
        ? "깨우는 중…"
        : "오프라인"
      : "확인 중";

  if (!userId) {
    return (
      <div className="app">
        <header className="app__header">
          <div>
            <h1 className="app__title">Invest</h1>
          </div>
          <div className="server-indicator">
            <span className={`status-dot status-dot--${serverStatus}`} />
            <span className="app__meta">{serverStatusLabel}</span>
          </div>
        </header>
        {error ? <div className="app__banner">{error}</div> : null}
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>로그인</h2>
          {serverStatus !== "online" ? (
            <p className="app__meta">
              {serverStatus === "offline" ? "서버 연결 대기 중…" : "서버 확인 중…"}
            </p>
          ) : !import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <p className="app__meta" style={{ color: "#dc2626" }}>
              VITE_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.
            </p>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div ref={googleBtnRef} />
            </div>
          )}
          {busy && <p className="app__meta" style={{ marginTop: "1rem" }}>로그인 중…</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="row" style={{ gap: "0.6rem", alignItems: "center" }}>
          {userProfile?.pictureUrl && (
            <img
              src={userProfile.pictureUrl}
              alt="profile"
              className="profile-avatar"
            />
          )}
          <div>
            <h1 className="app__title">Invest</h1>
            <p className="app__meta">
              {userProfile?.name ?? userId} · 현금{" "}
              <span className="mono">
                {cashBalance == null ? "—" : formatKRW(cashBalance)}
              </span>
            </p>
          </div>
        </div>
        <div className="row" style={{ gap: "0.75rem" }}>
          <div className="server-indicator">
            <span className={`status-dot status-dot--${serverStatus}`} />
            <span className="app__meta">{serverStatusLabel}</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => void refreshPortfolio(userId)}
            disabled={busy}
          >
            새로고침
          </button>
          <button type="button" className="btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <div className="rate-bar">
        {rateStatus === "loading" && (
          <span className="app__meta">환율 불러오는 중…</span>
        )}
        {rateStatus === "yahoo" && yahooRate != null && (
          <>
            <span className="app__meta">
              환율{" "}
              <span className="mono">
                ₩{yahooRate.toLocaleString("ko-KR")}/$
              </span>
              <span style={{ marginLeft: "0.3rem" }}>(Yahoo Finance)</span>
            </span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setRateStatus("manual")}
            >
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
              onChange={(ev) => setRateInput(ev.target.value)}
              inputMode="decimal"
            />
            <span className="app__meta">₩/$</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => void fetchRate()}
            >
              Yahoo에서 가져오기
            </button>
          </>
        )}
      </div>

      {error ? <div className="app__banner">{error}</div> : null}

      <div className="grid grid--2">
        <div className="card">
          <h2>시세 & 매매</h2>
          <p
            className="app__meta"
            style={{ marginTop: "-0.35rem", marginBottom: "0.65rem" }}
          >
            서버 메모리 캐시 기준으로 3초마다 갱신합니다.
          </p>
          <div className="row">
            <div className="field">
              <label htmlFor="sym">심볼</label>
              <div className="search-wrap" ref={searchWrapRef}>
                <input
                  id="sym"
                  value={symbolInput}
                  onChange={(ev) => {
                    setSymbolInput(ev.target.value.toUpperCase());
                    setSearchOpen(true);
                  }}
                  onBlur={() => {
                    const v = symbolInput.trim().toUpperCase();
                    if (v && /^[A-Z0-9.=^_\-+]{1,20}$/i.test(v)) {
                      setSymbol(v); setSymbolInput(v);
                    }
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      const v = symbolInput.trim().toUpperCase();
                      if (v && /^[A-Z0-9.=^_\-+]{1,20}$/i.test(v)) {
                        setSymbol(v); setSymbolInput(v);
                      }
                      setSearchOpen(false);
                    }
                  }}
                  onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                  autoComplete="off"
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="search-dropdown">
                    {searchResults.map((r) => (
                      <button
                        key={r.symbol}
                        type="button"
                        className="search-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSymbol(r.symbol);
                          setSymbolInput(r.symbol);
                          setSearchOpen(false);
                          setSearchResults([]);
                        }}
                      >
                        <span className="search-item__symbol">{r.symbol}</span>
                        {r.name && <span className="search-item__name">{r.name}</span>}
                        {r.exchange && <span className="search-item__exch">{r.exchange}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="field">
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-btn${
                    tradeMode === "qty" ? " mode-btn--active" : ""
                  }`}
                  onClick={() => setTradeMode("qty")}
                >
                  수량
                </button>
                <button
                  type="button"
                  className={`mode-btn${
                    tradeMode === "amount" ? " mode-btn--active" : ""
                  }`}
                  onClick={() => setTradeMode("amount")}
                >
                  금액
                </button>
              </div>
              {tradeMode === "qty" ? (
                <input
                  id="qty"
                  value={tradeQty}
                  onChange={(ev) => setTradeQty(ev.target.value)}
                  inputMode="decimal"
                  placeholder="수량"
                />
              ) : (
                <div>
                  <input
                    id="trade-amount"
                    value={tradeAmount}
                    onChange={(ev) => setTradeAmount(ev.target.value)}
                    inputMode="decimal"
                    placeholder="금액 (원)"
                  />
                  {amountQty != null && (
                    <p className="app__meta" style={{ marginTop: "0.2rem" }}>
                      ≈ {amountQty.toFixed(6)} 주
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {quote ? (
            <div
              className="row"
              style={{ marginTop: "0.75rem", flexWrap: "wrap" }}
            >
              <span className="mono">{quote.symbol}</span>
              {quote.name && <span className="app__meta">{quote.name}</span>}
              <strong className="mono">
                {formatQuotePrice(quote.price, rate)}
              </strong>
              {quote.marketState === "PRE" && quote.preMarketPrice != null && (
                <span className="app__meta extended-hours">
                  프리마켓 {formatQuotePrice(quote.preMarketPrice, rate)}
                </span>
              )}
              {(quote.marketState === "POST" || quote.marketState === "POSTPOST") &&
                quote.postMarketPrice != null && (
                <span className="app__meta extended-hours">
                  애프터마켓 {formatQuotePrice(quote.postMarketPrice, rate)}
                </span>
              )}
              <span className="app__meta">{formatWhen(quote.lastUpdated)}</span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => void handleBuy()}
                disabled={busy}
              >
                매수
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => void handleSell()}
                disabled={busy}
              >
                매도
              </button>
            </div>
          ) : symbol.trim() ? (
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
            <dl
              className="mono"
              style={{ margin: 0, display: "grid", gap: "0.35rem" }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>현금</dt>
                <dd style={{ margin: 0 }}>
                  {formatKRW(portfolio.cashBalance)}
                </dd>
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
                <dd style={{ margin: 0 }}>
                  {formatKRW(portfolio.netManualFunding)}
                </dd>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <dt>수동 입금 대비 손익률</dt>
                <dd style={{ margin: 0 }}>
                  {portfolio.pnlPercentVsFunding == null
                    ? "—"
                    : `${formatNum(portfolio.pnlPercentVsFunding)}%`}
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
              <label htmlFor="amt">금액 (원)</label>
              <input
                id="amt"
                value={walletAmount}
                onChange={(ev) => setWalletAmount(ev.target.value)}
                inputMode="decimal"
                placeholder="예: 1000000"
              />
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleDeposit()}
              disabled={busy}
            >
              입금
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => void handleWithdraw()}
              disabled={busy}
            >
              출금
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="tabs">
          <button
            type="button"
            className={`tab-btn${
              activeTab === "holdings" ? " tab-btn--active" : ""
            }`}
            onClick={() => setActiveTab("holdings")}
          >
            보유 주식
            {holdings.length > 0 && (
              <span className="tab-badge">{holdings.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`tab-btn${
              activeTab === "ledger" ? " tab-btn--active" : ""
            }`}
            onClick={() => {
              setActiveTab("ledger");
              if (userId)
                void refreshLedger(userId, ledgerTypes).catch(() => {});
            }}
          >
            거래·입출금 내역
          </button>
        </div>

        <div style={{ paddingTop: "0.75rem" }}>
          {activeTab === "holdings" && <Holdings holdings={holdings} />}
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
