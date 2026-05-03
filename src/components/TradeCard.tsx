import { useEffect, useMemo, useRef, useState } from "react";
import * as api from "../api/investApi";
import type { HoldingInfo, StockQuoteResponse, StockSearchResult } from "../types";
import { parsePositiveDecimal } from "../util/decimalInput";
import { formatChange, formatNum, formatQuotePrice, formatWhen, pnlClass, toKrw } from "../utils/format";
import { PriceChart } from "./PriceChart";

type TradeMode = "qty" | "amount";

type Props = {
  symbol: string;
  symbolInput: string;
  onSymbolInputChange: (v: string) => void;
  onSymbolConfirm: (sym: string) => void;
  quote: StockQuoteResponse | null;
  cashBalance: number | null;
  rate: number;
  currentHolding: HoldingInfo | null;
  busy: boolean;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onBuy: (qty: number) => void;
  onSell: (qty: number) => void;
  onSellAll: () => void;
  onRoundUp: () => void;
  onRoundDown: () => void;
  onError: (msg: string) => void;
};

export function TradeCard({
  symbol,
  symbolInput,
  onSymbolInputChange,
  onSymbolConfirm,
  quote,
  cashBalance,
  rate,
  currentHolding,
  busy,
  cardRef,
  onBuy,
  onSell,
  onSellAll,
  onRoundUp,
  onRoundDown,
  onError,
}: Props) {
  const [tradeMode, setTradeMode] = useState<TradeMode>("qty");
  const [tradeQty, setTradeQty] = useState("1");
  const [tradeAmount, setTradeAmount] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const amountQty = useMemo(() => {
    if (tradeMode !== "amount" || !quote) return null;
    const amt = parseFloat(tradeAmount);
    if (!amt || amt <= 0) return null;
    const priceKrw = toKrw(quote.price, quote.currency, rate);
    if (priceKrw <= 0) return null;
    return amt / priceKrw;
  }, [tradeMode, tradeAmount, quote, rate]);

  // 심볼 입력 디바운스 검색
  useEffect(() => {
    const q = symbolInput.trim();
    if (q.length < 1) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
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

  const resolveTradeQty = (): number | null => {
    if (tradeMode === "qty") return parsePositiveDecimal(tradeQty);
    return amountQty;
  };

  const handleBuyClick = () => {
    const qty = resolveTradeQty();
    if (!qty) {
      onError(tradeMode === "qty" ? "수량은 양의 숫자여야 합니다." : "금액을 입력하세요.");
      return;
    }
    onBuy(qty);
  };

  const handleSellClick = () => {
    const qty = resolveTradeQty();
    if (!qty) {
      onError(tradeMode === "qty" ? "수량은 양의 숫자여야 합니다." : "금액을 입력하세요.");
      return;
    }
    onSell(qty);
  };

  const confirmSymbol = (v: string) => {
    const sym = v.trim().toUpperCase();
    if (sym && /^[A-Z0-9.=^_\-+]{1,20}$/i.test(sym)) {
      onSymbolConfirm(sym);
    }
  };

  return (
    <div className="card" ref={cardRef}>
      <h2>시세 & 매매</h2>
      <p className="app__meta" style={{ marginTop: "-0.35rem", marginBottom: "0.65rem" }}>
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
                onSymbolInputChange(ev.target.value.toUpperCase());
                setSearchOpen(true);
              }}
              onBlur={() => confirmSymbol(symbolInput)}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") {
                  confirmSymbol(symbolInput);
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
                      onSymbolInputChange(r.symbol);
                      onSymbolConfirm(r.symbol);
                      setSearchOpen(false);
                      setSearchResults([]);
                    }}
                  >
                    <span className="search-item__symbol">{r.symbol}</span>
                    {r.name && <span className="search-item__name">{r.name}</span>}
                    <span className="search-item__exch">{r.exchange}</span>
                    {r.regularMarketPrice != null && (
                      <span className="search-item__price mono">
                        {formatQuotePrice(r.regularMarketPrice, rate, r.currency)}
                      </span>
                    )}
                    {r.regularMarketChangePercent != null && (
                      <span className={`search-item__chg mono ${pnlClass(r.regularMarketChangePercent)}`}>
                        {r.regularMarketChangePercent >= 0 ? "+" : ""}
                        {r.regularMarketChangePercent.toFixed(2)}%
                      </span>
                    )}
                    {cashBalance != null && r.regularMarketPrice != null && r.regularMarketPrice > 0 && (() => {
                      const priceKrw = r.currency === "KRW" ? r.regularMarketPrice : r.regularMarketPrice * rate;
                      const affordable = Math.floor(cashBalance / priceKrw);
                      return affordable > 0 ? (
                        <span className="search-item__affordable app__meta">
                          {affordable.toLocaleString("ko-KR")}주 매수가능
                        </span>
                      ) : null;
                    })()}
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
              className={`mode-btn${tradeMode === "qty" ? " mode-btn--active" : ""}`}
              onClick={() => setTradeMode("qty")}
            >
              수량
            </button>
            <button
              type="button"
              className={`mode-btn${tradeMode === "amount" ? " mode-btn--active" : ""}`}
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
        <div className="row" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
          <span className="mono">{quote.symbol}</span>
          {quote.name && <span className="app__meta">{quote.name}</span>}
          <strong className="mono">
            {formatQuotePrice(quote.price, rate, quote.currency)}
          </strong>
          {quote.regularMarketChange != null && quote.regularMarketChangePercent != null && (
            <span className={`mono ${pnlClass(quote.regularMarketChange)}`} style={{ fontSize: "0.9em" }}>
              {formatChange(quote.regularMarketChange, quote.regularMarketChangePercent, quote.currency)}
            </span>
          )}
          <ExtendedHoursBadge quote={quote} rate={rate} />
          <span className="app__meta">{formatWhen(quote.lastUpdated)}</span>
          {cashBalance != null && quote.price > 0 && (() => {
            const priceKrw = toKrw(quote.price, quote.currency, rate);
            const affordable = Math.floor(cashBalance / priceKrw);
            return (
              <span className="app__meta">
                현금으로 <span className="mono">{affordable.toLocaleString("ko-KR")}주</span> 매수 가능
              </span>
            );
          })()}
          <button type="button" className="btn btn--primary" onClick={handleBuyClick} disabled={busy}>
            매수
          </button>
          <button type="button" className="btn btn--danger" onClick={handleSellClick} disabled={busy}>
            매도
          </button>
          {currentHolding && (
            <button
              type="button"
              className="btn btn--danger btn--sm"
              onClick={onSellAll}
              disabled={busy}
              title={`${formatNum(currentHolding.quantity)}주 전량 매도`}
            >
              전량매도
            </button>
          )}
          {currentHolding && currentHolding.quantity % 1 > 0.000001 && (() => {
            const frac = currentHolding.quantity % 1;
            const needed = parseFloat((1 - frac).toFixed(8));
            const excess = parseFloat(frac.toFixed(8));
            return (
              <>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={onRoundUp}
                  disabled={busy}
                  title={`${formatNum(needed)}주 매수 → ${Math.ceil(currentHolding.quantity)}주`}
                >
                  +{formatNum(needed)}주 (올림)
                </button>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={onRoundDown}
                  disabled={busy}
                  title={`${formatNum(excess)}주 매도 → ${Math.floor(currentHolding.quantity)}주`}
                >
                  -{formatNum(excess)}주 (내림)
                </button>
              </>
            );
          })()}
        </div>
      ) : symbol.trim() ? (
        <p className="app__meta" style={{ marginTop: "0.75rem" }}>불러오는 중…</p>
      ) : (
        <p className="app__meta" style={{ marginTop: "0.75rem" }}>심볼을 입력하세요.</p>
      )}

      {symbol && <PriceChart symbol={symbol} />}
    </div>
  );
}

function ExtendedHoursBadge({
  quote,
  rate,
}: {
  quote: StockQuoteResponse;
  rate: number;
}) {
  const { marketState, preMarketPrice, postMarketPrice, price, currency } = quote;

  let label: string | null = null;
  let extPrice: number | null = null;

  if ((marketState === "PRE" || marketState === "PREPRE") && preMarketPrice != null) {
    label = "프리마켓";
    extPrice = preMarketPrice;
  } else if ((marketState === "POST" || marketState === "POSTPOST") && postMarketPrice != null) {
    label = "애프터마켓";
    extPrice = postMarketPrice;
  } else if (marketState === "CLOSED" && (postMarketPrice != null || preMarketPrice != null)) {
    label = "시간외";
    extPrice = postMarketPrice ?? preMarketPrice!;
  }

  if (!label || extPrice == null) return null;

  const chg = extPrice - price;
  const chgPct = price > 0 ? (chg / price) * 100 : null;

  return (
    <span className="extended-hours">
      {label} {formatQuotePrice(extPrice, rate, currency)}
      {chgPct != null && (
        <span className={`mono ${pnlClass(chg)}`} style={{ marginLeft: "0.35rem", fontSize: "0.9em" }}>
          {chg >= 0 ? "+" : ""}{chgPct.toFixed(2)}%
        </span>
      )}
    </span>
  );
}
