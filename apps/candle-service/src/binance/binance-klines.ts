export type BinanceKlineRow = [
    number,   // open time
    string,   // open
    string,   // high
    string,   // low
    string,   // close
    string,   // volume
    number,   // close time
    string,   // quote asset volume
    number,   // number of trades
    string,   // taker buy base asset volume
    string,   // taker buy quote asset volume
    string    // ignore
  ];
  
  export async function fetchBinanceKlines(
    symbol: string,
    interval: string,
    limit: number = 200
  ): Promise<BinanceKlineRow[]> {
    const url = new URL("https://api.binance.com/api/v3/klines");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("interval", interval);
    url.searchParams.set("limit", String(limit));
  
    const res = await fetch(url);
  
    if (!res.ok) {
      throw new Error(`[candle-service] Binance klines fetch failed: ${res.status} ${res.statusText}`);
    }
  
    return (await res.json()) as BinanceKlineRow[];
  }