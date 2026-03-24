SELECT COUNT(*) AS total_rows
FROM candles;

SELECT symbol, timeframe, open_time, open_price, high_price, low_price, close_price, volume
FROM candles
ORDER BY open_time DESC
LIMIT 20;

SELECT hypertable_schema, hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'candles';

SELECT chunk_schema, chunk_name, range_start, range_end
FROM timescaledb_information.chunks
WHERE hypertable_name = 'candles'
ORDER BY range_start DESC
LIMIT 10;