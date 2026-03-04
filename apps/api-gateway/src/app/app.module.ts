import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TickConsumerService } from 'src/tick-consumer.service';
import { TickGateway } from 'src/tick.gateway';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true
        })
    ],
    providers: [TickConsumerService, TickGateway]
})
export class AppModule {}
