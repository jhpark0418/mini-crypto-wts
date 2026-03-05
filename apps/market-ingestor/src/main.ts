import { randomUUID } from "node:crypto";
import type { TickEvent } from "@wts/common";
import { createProducer, publishJson } from "@wts/kafka";

const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092").split(",");
const TOPIC = "tick.BTCUSDT";

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

async function main() {
  const producer = await createProducer({
    clientId: "market-ingestor",
    brokers
  });

  console.log("[market-ingestor] producer connected:", brokers.join(","));

  // 시작 가격(직전 가격을 계속 업데이트)
  let lastPrice = 65000;

  // “진짜처럼” 보이도록 파라미터
  const baseVol = 2.0;          // 평소 1초당 변동폭(대략 달러 단위)
  const spikeProb = 0.03;       // 가끔 튀는 확률
  const spikeVol = 15.0;        // 튀는 경우 추가 변동폭
  const minPrice = 60000;       // 너무 내려가지 않게
  const maxPrice = 70000;       // 너무 올라가지 않게

  setInterval(async () => {
    // 기본 변동 (정규분포 비슷)
    let delta = randn() * baseVol;

    // 가끔 스파이크(뉴스처럼)
    if (Math.random() < spikeProb) {
      delta += randn() * spikeVol;
    }

    // 새 가격
    const nextPrice = clamp(lastPrice + delta, minPrice, maxPrice);
    lastPrice = nextPrice;

    const e: TickEvent = {
      eventId: randomUUID(),
      type: "TICK_RECEIVED",
      symbol: "BTCUSDT",
      price: Number(nextPrice.toFixed(2)),
      qty: 0.01,
      ts: new Date().toISOString(),
      source: "mock"
    };

    try {
      await publishJson(producer, TOPIC, e);
      console.log("[market-ingestor] published:", TOPIC, e.price.toFixed(2));
    } catch (err) {
      console.error("[market-ingestor] publish failed:", err);
    }
  }, 1000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});