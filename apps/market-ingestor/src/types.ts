export type BinanceTradeMessage = {
    e: "trade";
    E: number;      // event time
    s: string;      // symbol
    t: number;      // trade id
    p: string;      // price
    q: string;      // quantity
    T: number;      // trade time
    m: boolean;
    M: boolean;
}