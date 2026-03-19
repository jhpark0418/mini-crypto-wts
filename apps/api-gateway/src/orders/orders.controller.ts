import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { isValidSymbol, OrderSide, OrderType, Symbol } from '@wts/common';

@Controller('api/orders')
export class OrdersController {
    constructor(
        private readonly ordersService: OrdersService
    ) {}

    @Post()
    async createOrder(
        @Body()
        body: {
            accountId: string;
            symbol: Symbol;
            side: OrderSide;
            orderType: OrderType;
            price?: number;
            qty: number;
        }
    ) {
        return this.ordersService.createOrder(body);
    }

    @Get()
    async getOrders(
        @Query("accountId") accountId: string,
        @Query("symbol") symbol?: string,
        @Query("limit") limit?: number
    ) {
        const normalizedSymbol = symbol && isValidSymbol(symbol) ? (symbol as Symbol) : undefined;

        return this.ordersService.findOrders({
            accountId,
            symbol: normalizedSymbol,
            limit: limit ? Number(limit) : 50
        });
    }
}
