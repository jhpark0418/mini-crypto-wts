# @cmp/api-gateway

Crypto Market Pipeline의 API Gateway 애플리케이션입니다.

Binance에서 수집되고 Kafka를 통해 가공된 시장 데이터를
REST API와 WebSocket으로 외부 클라이언트에 전달합니다.

주요 역할은 다음과 같습니다.

- 캔들 히스토리 조회 API 제공
- 현재 진행 중인 Active Candle 조회 API 제공
- Redis 기반 오더북 스냅샷 조회 API 제공
- WebSocket을 통한 실시간 시장 데이터 푸시
- web 클라이언트와 시장 데이터 파이프라인 사이의 진입점 역할

---

## Tech Stack

- NestJS
- TypeScript
- Redis
- PostgreSQL
- Kafka
- Socket.IO

---

## Project Role

이 애플리케이션은 직접 시장 데이터를 생성하지 않습니다.

역할은 크게 두 가지입니다.

1. 저장된 시장 데이터를 조회 가능한 형태로 제공
2. 실시간으로 갱신되는 데이터를 WebSocket으로 전달

즉, `market-ingestor`와 `candle-service`가 데이터를 만들고,
`api-gateway`는 그 결과를 외부에 노출합니다.

---

## 주요 API

### 1. Candle History

과거 캔들 데이터를 조회합니다.

```http
GET /api/candles?symbol=BTCUSDT&timeframe=1m&limit=200
```

Example Response
```JSON
[
  {
    "symbol": "BTCUSDT",
    "timeframe": "1m",
    "openTime": "2026-03-20T10:00:00.000Z",
    "closeTime": "2026-03-20T10:00:59.999Z",
    "open": 84250.12,
    "high": 84310.55,
    "low": 84210.01,
    "close": 84290.99,
    "volume": 12.548
  }
]
```

### 2. Active Candle Snapshot

현재 메모리/Redis에 유지 중인 진행 중 캔들 상태를 조회합니다.

```http
GET /api/market/active-candle?symbol=BTCUSDT&timeframe=1m
```

### 3. Orderbook Snapshot

Redis에 저장된 오더북 스냅샷을 조회합니다.

```http
GET /api/market/orderbook?symbol=BTCUSDT&limit=20
```

---

## WebSocket

실시간 시장 데이터를 클라이언트에 전달합니다.<br>
기본적으로 web 클라이언트는 다음 흐름으로 데이터를 사용합니다.

1. REST API로 과거 캔들 조회
2. WebSocket으로 최신 캔들 업데이트 수신
3. 차트에 이어서 반영

실시간 전송 대상 예시

- active candle update
- market snapshot update
- orderbook snapshot update

실제 이벤트 이름은 구현 코드 기준으로 확인하면 됩니다.

--- 

## Run

루트 워크스페이스 기준 실행 예시입니다.

```shell
npm run dev:api
```

---

## Related Apps

- apps/market-ingestor

Binance 실시간 trade / depth 데이터 수집

- apps/candle-service

Kafka 이벤트를 소비하여 멀티 타임프레임 캔들 집계

- apps/web

REST + WebSocket 데이터를 사용하는 실시간 차트 UI

---

## Data Flow

```text
Binance WebSocket
    ↓
market-ingestor
    ↓
Kafka
    ↓
candle-service
    ↓
Redis / PostgreSQL
    ↓
api-gateway
    ↓
web
```