# invest-fe — Frontend CLAUDE.md

## 프로젝트 개요
주식 투자 시뮬레이션 SPA. React 19 + TypeScript + Vite. 백엔드는 `../invest-be`.

## 기술 스택
- **React 19** + **TypeScript ~5.7** + **Vite 6**
- **lightweight-charts 5** — 주가 차트
- CSS: 별도 프레임워크 없음, `App.css` + 컴포넌트별 인라인 스타일
- 빌드: `npm run build` / 개발: `npm run dev` (포트 5173)

## 환경변수 (`.env`)
```
VITE_API_BASE_URL=http://localhost:8080   # 백엔드 주소
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

## 소스 구조
```
src/
├── App.tsx              # 최상위 상태 관리 + 라우팅 없음
├── App.css              # 전역 스타일
├── types.ts             # 모든 공유 타입 정의
├── google.d.ts          # window.google (GIS) 타입 선언
├── api/
│   └── investApi.ts     # 백엔드 API 호출 함수 모음
├── components/
│   ├── AppHeader.tsx    # 헤더 (프로필, 서버 상태, 새로고침/로그아웃)
│   ├── RateBar.tsx      # 환율 표시/수동 설정 바
│   ├── TradeCard.tsx    # 시세 & 매매 카드 (검색, 시세, 매수/매도 버튼, 차트)
│   ├── PortfolioCard.tsx# 포트폴리오 요약 + 만약에 계산기
│   ├── WalletCard.tsx   # 입출금 카드
│   ├── Holdings.tsx     # 보유 종목 테이블 (P&L 포함, 클릭 → 심볼 선택)
│   ├── Ledger.tsx       # 거래 원장 테이블 + 필터
│   ├── PriceChart.tsx   # lightweight-charts 라인 차트 (기간 선택)
│   └── WhatIf.tsx       # 만약에 계산기 (QQQ/VOO 등 비교)
├── util/
│   └── decimalInput.ts  # 양수 소수 파싱 헬퍼
└── utils/
    └── format.ts        # formatKRW / formatQuotePrice / formatNum / formatWhen
                         # formatChange / pnlClass / toKrw
```

## 핵심 설계
- **상태 관리**: API 상태(symbol, quote, portfolio 등)는 `App.tsx`에 집중. `TradeCard`만 예외적으로 자체 UI 상태(tradeMode, tradeQty, tradeAmount, 검색 드롭다운)를 보유
- **인증**: Google Identity Services (GIS) 버튼 → ID 토큰 → `POST /api/auth/google`. userId(Google sub)를 localStorage에 저장
- **환율**: `KRW=X` 심볼로 Yahoo Finance에서 실시간 조회. 실패 시 수동 입력(기본 1500)
- **심볼 입력**: `symbolInput`(검색용, 한글 포함)과 `symbol`(시세 조회용, ASCII만) 분리. Enter/드롭다운 선택 시에만 `symbol` 확정
- **서버 헬스체크**: `/actuator/health` 30초(온라인)/5초(오프라인) 폴링. 상태 표시 아이콘
- **금액 기준 매매**: 수량 또는 원화 금액으로 매수/매도 가능
- **소수주 정수화**: 소수 보유 시 올림(다음 정수까지 매수) / 내림(소수 부분 매도) 버튼 표시
- **매수 가능 주수**: 시세 카드와 검색 드롭다운에 현금 잔고 기준 정수 매수 가능 주수 표시

### 통화 처리
`StockQuoteResponse.currency`(백엔드 Yahoo `meta.currency`)를 기준으로 분기:
- `currency === "KRW"` → 가격 그대로 (`toKrw(price, currency, rate)` 사용)
- 그 외 → `price * rate` 후 `₩xxx ($xxx)` 형식
- `amountQty` 계산, 매수 가능 주수 계산 모두 `toKrw()` 사용 — 중복 인라인 금지

### 시간외 가격 표시 (marketState 기준)
`TradeCard.tsx`의 `ExtendedHoursBadge` 컴포넌트가 처리:
- `PRE`/`PREPRE` → preMarketPrice + 정규장 대비 등락% 배지 "프리마켓"
- `POST`/`POSTPOST` → postMarketPrice + 정규장 대비 등락% 배지 "애프터마켓"
- `CLOSED` → postMarketPrice 우선, 없으면 preMarketPrice, "시간외" + 등락%
- 등락%는 `(extPrice - regularPrice) / regularPrice * 100` 프론트에서 직접 계산

## 주요 API 함수 (`investApi.ts`)
| 함수 | 엔드포인트 |
|------|-----------|
| `googleLogin(idToken)` | `POST /api/auth/google` |
| `getQuote(symbol)` | `GET /api/stocks/{symbol}/quote` |
| `searchStocks(query)` | `GET /api/stocks/search?q=` |
| `getHistory(symbol, range)` | `GET /api/stocks/{symbol}/history?range=` |
| `buy(userId, symbol, qty)` | `POST /api/orders/buy` |
| `sell(userId, symbol, qty)` | `POST /api/orders/sell` |
| `deposit/withdraw(userId, amount)` | `POST /api/wallet/deposit|withdraw` |
| `getPortfolio(userId)` | `GET /api/portfolio` |
| `getHoldings(userId)` | `GET /api/portfolio/holdings` |
| `getLedger(userId, types?)` | `GET /api/ledger` |
| `getWhatIf(userId, symbol)` | `GET /api/portfolio/whatif` |

## 색상 규칙
한국 증시 관례 적용: **상승(양수) = 빨강(`pnl--pos`)**, **하락(음수) = 파랑(`pnl--neg`)**
- `format.ts`의 `pnlClass(value)` 헬퍼로 클래스명 결정
- `formatChange(change, changePct, currency)` — 등락폭 + 퍼센트 포맷 (KRW/USD 분기)
- App.css `.pnl--pos`: `#dc2626`(red) / `.pnl--neg`: `#2563eb`(blue), 다크모드도 동일 규칙

## 차트 range 값
`1d` `1w` `1mo` `3mo` `6mo` `1y` — `PriceChart.tsx`에서 선택

## 알려진 제약
- 차트 1일/1주 데이터는 intraday(분봉). lightweight-charts에 epoch seconds로 전달
- What-if 환율은 현재 환율 고정 (과거 환율 미반영)
- 한글 심볼은 검색용으로만 사용, 시세 조회 시 반드시 ASCII 심볼로 확정
