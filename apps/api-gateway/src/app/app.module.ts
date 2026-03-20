import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createPostgresOptions } from '@cmp/db';
import { CandlesModule } from 'src/candles/candles.module';
import { MarketModule } from 'src/market/market.module';
import { RedisModule } from 'src/redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => 
                createPostgresOptions(
                    {
                        DB_HOST: config.get<string>("DB_HOST"),
                        DB_PORT: config.get<string>("DB_PORT"),
                        DB_USERNAME: config.get<string>("DB_USERNAME"),
                        DB_PASSWORD: config.get<string>("DB_PASSWORD"),
                        DB_DATABASE: config.get<string>("DB_DATABASE"),
                    },
                    {
                        synchronize: false
                    }
                )
        }),
        CandlesModule,
        MarketModule,
        RedisModule,
    ],
})
export class AppModule {}
