SELECT extname, extversion
FROM pg_extension
WHERE extname = 'timescaledb';

SELECT hypertable_schema, hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'candles';

SELECT chunk_schema, chunk_name, range_start, range_end
FROM timescaledb_information.chunks
WHERE hypertable_name = 'candles'
ORDER BY range_start DESC
LIMIT 10;

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'candles'
ORDER BY indexname;