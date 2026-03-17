import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly redis: Redis;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.redis = new Redis({
            host: this.configService.get<string>("REDIS_HOST", "localhost"),
            port: Number(this.configService.get<string>("REDIS_PORT", "6379")),
            db: Number(this.configService.get<string>("REDIS_DB", "0"))
        });
    }

    async setJson(key: string, value: unknown, ttlSeconds?: number) {
        const json = JSON.stringify(value);

        if (ttlSeconds && ttlSeconds > 0) {
            await this.redis.set(key, json, "EX", ttlSeconds);
            return;
        }

        await this.redis.set(key, json);
    }

    async getJson<T>(key: string): Promise<T | null> {
        const value = await this.redis.get(key);
        if (!value) return null;
        return JSON.parse(value) as T;
    }

    async onModuleDestroy() {
        await this.redis.quit();
    }
}
