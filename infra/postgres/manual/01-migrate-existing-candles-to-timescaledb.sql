CREATE EXTENSION IF NOT EXISTS timescaledb;

BEGIN;

-- 1) 시간 컬럼을 timestamptz 로 정렬
ALTER TABLE candles
    ALTER COLUMN open_time TYPE TIMESTAMPTZ
    USING open_time AT TIME ZONE 'UTC';

ALTER TABLE candles
    ALTER COLUMN created_at TYPE TIMESTAMPTZ
    USING created_at AT TIME ZONE 'UTC';

ALTER TABLE candles
    ALTER COLUMN updated_at TYPE TIMESTAMPTZ
    USING updated_at AT TIME ZONE 'UTC';

-- 2) 예전 단일 PK(id) 같은 기존 PK 제거
DO $$
DECLARE
    pk_name text;
BEGIN
    SELECT tc.constraint_name
      INTO pk_name
      FROM information_schema.table_constraints tc
     WHERE tc.table_schema = 'public'
       AND tc.table_name = 'candles'
       AND tc.constraint_type = 'PRIMARY KEY'
     LIMIT 1;

    IF pk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.candles DROP CONSTRAINT %I', pk_name);
    END IF;
END $$;

-- 3) 예전 UNIQUE 제약이 있으면 정리
ALTER TABLE public.candles
    DROP CONSTRAINT IF EXISTS uq_candle;

ALTER TABLE public.candles
    DROP CONSTRAINT IF EXISTS pk_candles;

COMMIT;

-- 4) 기존 데이터 포함 hypertable 전환
SELECT create_hypertable(
    'candles',
    by_range('open_time', INTERVAL '1 day'),
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 5) 현재 프로젝트 기준 복합 PK 재생성
ALTER TABLE public.candles
    ADD CONSTRAINT pk_candles PRIMARY KEY (symbol, timeframe, open_time);

-- 6) 조회 패턴용 인덱스 보장
CREATE INDEX IF NOT EXISTS idx_candle_symbol_timeframe_open_time
    ON public.candles (symbol, timeframe, open_time DESC);