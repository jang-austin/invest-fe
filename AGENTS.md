# invest-fe — 에이전트 가이드

프로젝트 맥락 규칙(항상 적용): `.cursor/rules/invest-project.mdc`

## 레포 역할

Vite + React + TypeScript 단일 페이지 앱. `../invest-be` REST API를 호출한다.

## 로컬 개발

1. 백엔드 기동(기본 포트는 `invest-be`의 `application.yml` 참고, 보통 `8080`).
2. 루트에 `.env` 또는 `.env.local`:

   `VITE_API_BASE_URL=http://localhost:8080`

3. `npm install` 후 `npm run dev`.

## Netlify

빌드 명령 `npm run build`, publish 디렉터리 `dist`. SPA 리라이트는 `netlify.toml`에 정의.

## API 요약

- `POST /api/auth/login` — `{ userId }`
- `GET /api/stocks/{symbol}/quote`
- `POST /api/orders/buy|sell` — `{ userId, symbol, quantity }`
- `POST /api/wallet/deposit|withdraw` — `{ userId, amount }`
- `GET /api/portfolio?userId=`
- `GET /api/ledger?userId=&types=` — 필터 없으면 전체

Ledger `types` 값: `ADD_MONEY`, `SUBTRACT_MONEY`, `BUY`, `SELL`.

## 코드 위치

- `src/api/investApi.ts` — fetch 래퍼
- `src/types.ts` — DTO 타입
- `src/App.tsx` — 화면 조합
