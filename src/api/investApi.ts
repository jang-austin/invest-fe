import type {
  HoldingInfo,
  LedgerEntryResponse,
  PortfolioResponse,
  StockQuoteResponse,
  TransactionType,
  UserResponse,
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

export async function login(userId: string): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export async function getQuote(symbol: string): Promise<StockQuoteResponse> {
  const sym = encodeURIComponent(symbol.trim());
  return requestJson<StockQuoteResponse>(`/api/stocks/${sym}/quote`);
}

export async function buy(
  userId: string,
  symbol: string,
  quantity: number,
  exchangeRate: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/orders/buy", {
    method: "POST",
    body: JSON.stringify({
      userId,
      symbol: symbol.trim(),
      quantity,
      exchangeRate,
    }),
  });
}

export async function sell(
  userId: string,
  symbol: string,
  quantity: number,
  exchangeRate: number
): Promise<UserResponse> {
  return requestJson<UserResponse>("/api/orders/sell", {
    method: "POST",
    body: JSON.stringify({
      userId,
      symbol: symbol.trim(),
      quantity,
      exchangeRate,
    }),
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
