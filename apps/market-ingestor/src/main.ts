import { randomUUID } from "node:crypto";
import type { TickEvent } from "@wts/common";
import { createProducer, publishJson } from "@wts/kafka";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
// const TOPIC = "tick.BTCUSDT";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 정규분포 비슷하게(중앙에 몰리는 랜덤) 만들기: Box-Muller
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

type SymbolType = "BTCUSDT" | "ETHUSDT";

type MarketState = {
  lastPrice: number;
  minPrice: number;
  maxPrice: number;
  baseVol: number;
  spikeProb: number;
  spikeVol: number;
};

const MARKETS: Record<SymbolType, MarketState> = {
  BTCUSDT: {
    lastPrice: 65000,
    minPrice: 60000,
    maxPrice: 70000,
    baseVol: 2.0,
    spikeProb: 0.03,
    spikeVol: 15.0,
  },
  ETHUSDT: {
    lastPrice: 3500,
    minPrice: 3000,
    maxPrice: 4500,
    baseVol: 1.2,
    spikeProb: 0.03,
    spikeVol: 10.0,
  },
};

async function main() {
  const producer = await createProducer({
    clientId: "market-ingestor",
    brokers
  });

  console.log("[market-ingestor] producer connected:", brokers.join(","));

  setInterval(async () => {
    for (const symbol of Object.keys(MARKETS) as SymbolType[]) {
      const market = MARKETS[symbol];

      let delta = randn() * market.baseVol;

      if (Math.random() < market.spikeProb) {
        delta += randn() * market.spikeVol;
      }

      const nextPrice = clamp(
        market.lastPrice + delta,
        market.minPrice,
        market.maxPrice
      );

      market.lastPrice = nextPrice;

      const event: TickEvent = {
        eventId: randomUUID(),
        type: "TICK_RECEIVED",
        symbol,
        price: Number(nextPrice.toFixed(2)),
        qty: Number((0.001 + Math.random() * 0.02).toFixed(4)),
        ts: new Date().toISOString(),
        source: "mock"
      }

      const topic = `tick.${symbol}`;

      try {
        await publishJson(producer, topic, event);
        console.log("[market-ingestor] published:", topic, event.price.toFixed(2));
      } catch (err) {
        console.error("[market-ingestor] publish failed:", topic, err);
      }
    }

    // // 기본 변동 (정규분포 비슷)
    // let delta = randn() * baseVol;

    // // 가끔 스파이크(뉴스처럼)
    // if (Math.random() < spikeProb) {
    //   delta += randn() * spikeVol;
    // }

    // // 새 가격
    // const nextPrice = clamp(lastPrice + delta, minPrice, maxPrice);
    // lastPrice = nextPrice;

    // const e: TickEvent = {
    //   eventId: randomUUID(),
    //   type: "TICK_RECEIVED",
    //   symbol: "BTCUSDT",
    //   price: Number(nextPrice.toFixed(2)),
    //   qty: 0.01,
    //   ts: new Date().toISOString(),
    //   source: "mock"
    // };

    // try {
    //   await publishJson(producer, TOPIC, e);
    //   console.log("[market-ingestor] published:", TOPIC, e.price.toFixed(2));
    // } catch (err) {
    //   console.error("[market-ingestor] publish failed:", err);
    // }
  }, 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});