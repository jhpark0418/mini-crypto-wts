import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { CandleEvent, OrderbookSnapshotEvent, TickEvent } from "@wts/common";
import { Server } from "socket.io";

@WebSocketGateway({
    namespace: "/ws",
    cors: {
        origin: true,
        credentials: true
    }
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    handleConnection(client: any) {
        console.log("[ws] connected:", client.id);
    }

    handleDisconnect(client: any) {
        console.log("[ws] disconnected:", client.id);
    }

    broadcastTick(tick: TickEvent) {
        // 이벤트명은 tick 으로 통일
        this.server.emit("tick", tick);
    }

    broadcastCandle(candle: CandleEvent) {
        this.server.emit("candle", candle);
    }

    broadcastOrdebook(orderbook: OrderbookSnapshotEvent) {
        this.server.emit("orderbook", orderbook);
    }
}