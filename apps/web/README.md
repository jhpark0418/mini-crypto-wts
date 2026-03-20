

# @cmp/web

Crypto Market Pipeline의 웹 클라이언트 애플리케이션입니다.

REST API로 과거 캔들 데이터를 불러오고,
WebSocket으로 실시간 시장 데이터를 받아
차트와 오더북 화면에 반영합니다.

---

## Tech Stack

- React
- TypeScript
- Vite
- lightweight-charts
- Socket.IO Client

---

## Project Role

이 애플리케이션은 시장 데이터를 직접 생성하지 않고,
`api-gateway`가 제공하는 데이터를 시각화하는 역할을 담당합니다.

주요 기능은 다음과 같습니다.

- 심볼 선택
- 타임프레임 선택
- 과거 캔들 히스토리 로드
- 실시간 캔들 업데이트 반영
- 오더북 스냅샷 표시
- 차트 tooltip / crosshair 기반 정보 표시

---

## 주요 화면 기능

### 1. Candle Chart

- 초기 진입 시 REST API로 과거 캔들 데이터 조회
- 차트 라이브러리의 `setData()`로 초기 데이터 렌더링
- 이후 WebSocket 수신 데이터로 `update()` 반영
- 타임프레임 변경 시 새로운 히스토리 재조회

---

### 2. Symbol / Timeframe Selector

사용자가 조회할 마켓과 타임프레임을 선택할 수 있습니다.

예시

- Symbol: `BTCUSDT`, `ETHUSDT`
- Timeframe: `10s`, `30s`, `1m`, `5m`, `15m`, `30m`

---

### 3. Orderbook View

오더북 스냅샷 데이터를 조회하고,
현재 시장 호가 상황을 화면에 표시합니다.

---

## Data Loading Flow

웹 클라이언트는 아래 순서로 동작합니다.

1. 선택된 심볼과 타임프레임 기준으로 REST 요청
2. 과거 캔들 데이터를 차트에 초기 렌더링
3. WebSocket 연결
4. 실시간 active candle / market update 수신
5. 최신 차트 데이터로 반영

즉, 과거 데이터와 실시간 데이터가 분리되어 동작합니다.

---

## API / Socket Dependency

이 앱은 `api-gateway`가 실행 중이어야 정상 동작합니다.

주요 의존 데이터

- `GET /api/candles`
- `GET /api/market/active-candle`
- `GET /api/market/orderbook`
- Socket.IO realtime events

---

## Run

루트 워크스페이스 기준 실행 예시입니다.
```bash
npm run dev:web
```

---

## 화면 동작 개념

1. 사용자 심볼/타임프레임 선택
2. REST API로 과거 캔들 조회
3. 차트 초기 렌더링
4. WebSocket 연결
5. 실시간 캔들/오더북 업데이트 반영

---

## Related Apps

- apps/api-gateway

시장 데이터 조회 API 및 WebSocket 제공

- apps/market-ingestor

Binance 실시간 데이터 수집

- apps/candle-service

캔들 집계 및 스냅샷 생성
