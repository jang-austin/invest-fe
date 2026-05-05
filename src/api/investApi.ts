import type {
  AdvisorContextResponse,
  HoldingInfo,
  StockNewsItem,
  StockUniverseItem,
  HistoryPoint,
  LedgerEntryResponse,
  PortfolioResponse,
  StockQuoteResponse,
  StockSearchResult,
  TransactionType,
  UserResponse,
  WhatIfResponse,
} from "../types";

function apiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  const base =
    typeof raw === "string" && raw.trim().length > 0
      ? raw.trim()
      : "http://localhost:8080";
  return base.replace(/\/$/, "");
}

async function readBodyMessage(res: Response): Promise<string | undefined> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    const j = JSON.parse(text) as { message?: string };
    return typeof j.message === "string" ? j.message : text;
  } catch {
    return text;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const msg = (await readBodyMessage(res)) ?? res.statusText;
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/actuator/health`);
    if (!res.ok) return false;
    const body = (await res.json()) as { status?: string };
    return body.status === "UP";
  } catch {
    return false;
  }
}

export async function googleLogin(idToken: string): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export async function getQuote(symbol: string): Promise<StockQuoteResponse> {
  const sym = encodeURIComponent(symbol.trim());
  return requestJson<StockQuoteResponse>(`/api/stocks/${sym}/quote`);
}

export async function buy(
  userId: string,
  symbol: string,
  quantity: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/orders/buy", {
    method: "POST",
    body: JSON.stringify({ userId, symbol: symbol.trim(), quantity }),
  });
}

export async function sell(
  userId: string,
  symbol: string,
  quantity: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/orders/sell", {
    method: "POST",
    body: JSON.stringify({ userId, symbol: symbol.trim(), quantity }),
  });
}

export async function deposit(
  userId: string,
  amount: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/wallet/deposit", {
    method: "POST",
    body: JSON.stringify({ userId, amount }),
  });
}

export async function withdraw(
  userId: string,
  amount: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify({ userId, amount }),
  });
}

export async function getPortfolio(userId: string): Promise<PortfolioResponse> {
  const q = new URLSearchParams({ userId });
  return requestJson<PortfolioResponse>(`/api/portfolio?${q}`);
}

export async function getHoldings(userId: string): Promise<HoldingInfo[]> {
  const q = new URLSearchParams({ userId });
  return requestJson<HoldingInfo[]>(`/api/portfolio/holdings?${q}`);
}

export async function getLedger(
  userId: string,
  types?: TransactionType[]
): Promise<LedgerEntryResponse[]> {
  const q = new URLSearchParams({ userId });
  if (types && types.length > 0) {
    for (const t of types) {
      q.append("types", t);
    }
  }
  return requestJson<LedgerEntryResponse[]>(`/api/ledger?${q}`);
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const q = new URLSearchParams({ q: query });
  return requestJson<StockSearchResult[]>(`/api/stocks/search?${q}`);
}

export async function getHistory(symbol: string, range: string): Promise<HistoryPoint[]> {
  const q = new URLSearchParams({ range });
  return requestJson<HistoryPoint[]>(`/api/stocks/${encodeURIComponent(symbol)}/history?${q}`);
}

export async function getWhatIf(userId: string, symbol: string): Promise<WhatIfResponse> {
  const q = new URLSearchParams({ userId, symbol });
  return requestJson<WhatIfResponse>(`/api/portfolio/whatif?${q}`);
}

export async function getStockUniverse(index: "sp500" | "nasdaq100" | "all" = "all"): Promise<StockUniverseItem[]> {
  const q = new URLSearchParams({ index });
  return requestJson<StockUniverseItem[]>(`/api/stocks/universe?${q}`);
}

export async function getStockNews(symbols: string[], count = 5): Promise<StockNewsItem[]> {
  const q = new URLSearchParams({ symbols: symbols.join(","), count: String(count) });
  return requestJson<StockNewsItem[]>(`/api/stocks/news?${q}`);
}

export async function getAdvisorContext(
  userId: string,
  stablePct = 30,
  aggressivePct = 70,
): Promise<AdvisorContextResponse> {
  const q = new URLSearchParams({
    userId,
    stablePct: String(stablePct),
    aggressivePct: String(aggressivePct),
  });
  return requestJson<AdvisorContextResponse>(`/api/portfolio/advisor-context?${q}`);
}
