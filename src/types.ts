export type TransactionType = "ADD_MONEY" | "SUBTRACT_MONEY" | "BUY" | "SELL";

export type UserResponse = {
  id: string;
  balance: number;
};

export type StockQuoteResponse = {
  symbol: string;
  price: number;
  lastUpdated: string;
};

export type PortfolioResponse = {
  cashBalance: number;
  stockValue: number;
  totalValue: number;
  netManualFunding: number;
  pnlPercentVsFunding: number | null;
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
