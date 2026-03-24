EXPLAIN ANALYZE
SELECT symbol, timeframe, open_time, open_price, high_price, low_price, close_price, volume
FROM candles
WHERE symbol = 'BTCUSDT'
  AND timeframe = '1m'
ORDER BY open_time DESC
LIMIT 200;

EXPLAIN ANALYZE
SELECT symbol, timeframe, open_time, open_price, high_price, low_price, close_price, volume
FROM candles
WHERE symbol = 'ETHUSDT'
  AND timeframe = '5m'
ORDER BY open_time DESC
LIMIT 200;