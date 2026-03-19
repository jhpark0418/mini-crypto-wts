import { Controller, Get, Query } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { isValidSymbol, Symbol } from "@wts/common";

@Controller("api/trades")
export class TradesController {
    constructor(
        private readonly ordersService: OrdersService
    ) {}

    @Get()
    async getTrades(
        @Query("symbol") symbol?: string,
        @Query("limit") limit?: number
    ) {
        const normalizedSymbol = symbol && isValidSymbol(symbol) ? (symbol as Symbol) : undefined;

        return this.ordersService.findTrades({
            symbol: normalizedSymbol,
            limit: limit ? Number(limit) : 50
        });
    }
}