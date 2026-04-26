export type TransactionType = "ADD_MONEY" | "SUBTRACT_MONEY" | "BUY" | "SELL" | "DIVIDEND_REINVEST";

export type UserResponse = {
  id: string;
  balance: number;
  email: string | null;
  name: string | null;
  pictureUrl: string | null;
};

export type StockQuoteResponse = {
  symbol: string;
  price: number;
  name: string | null;
  lastUpdated: string;
  preMarketPrice: number | null;
  postMarketPrice: number | null;
  marketState: string | null;
};

export type PortfolioResponse = {
  cashBalance: number;
  stockValue: number;
  totalValue: number;
  netManualFunding: number;
  pnlPercentVsFunding: number | null;
};

export type HoldingInfo = {
  symbol: string;
  quantity: number;
  averageCostKrw: number;
  currentPriceKrw: number;
  currentValueKrw: number;
  pnlAmountKrw: number;
  pnlPercent: number | null;
};

export type StockSearchResult = {
  symbol: string;
  name: string | null;
  exchange: string | null;
  type: string | null;
};

export type LedgerEntryResponse = {
  id: number;
  type: TransactionType;
  symbol: string | null;
  quantity: number | null;
  unitPrice: number | null;
  cashDelta: number;
  createdAt: string;
};
