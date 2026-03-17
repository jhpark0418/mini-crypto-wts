import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandlesModule } from 'src/candles/candles.module';
import { CandleEntity } from 'src/candles/entities/candle.entity';
import { MarketConsumerService } from 'src/market-consumer.service';
import { MarketGateway } from 'src/market.gateway';
import { MarketModule } from 'src/market/market.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: "postgres" as const,
                host: config.get<string>("DB_HOST", "localhost"),
                port: Number(config.get<string>("DB_PORT", "5432")),
                username: config.get<string>("DB_USERNAME", "postgres"),
                password: config.get<string>("DB_PASSWORD", "postgres"),
                database: config.get<string>("DB_DATABASE", "miniwts"),
                entities: [CandleEntity],
                synchronize: false,
                logging: false,
            })
        }),
        CandlesModule,
        MarketModule,
        RedisModule
    ],
})
export class AppModule {}
