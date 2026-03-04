import { useEffect, useState } from 'react'
import { io } from "socket.io-client";


type TickEvent = {
  eventId: string;
  symbol: string;
  price: number;
  qty: number;
  ts: string;
  source: string;
}

export default function App() {
  const [connected, setConnected] = useState(false);
  const [tick, setTick] = useState<TickEvent | null>(null);

  useEffect(() => {
    const socket = io("http://localhost:3000/ws", {
      transports: ["websocket"]
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("tick", (msg: TickEvent) => setTick(msg));

    return () => {
      socket.disconnect();
    }
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h2>mini-crypto-wts</h2>
      <div>
        WS: <b>{connected ? "CONNECTED" : "DISCONNECTED"}</b>
      </div>

      <div style={{ marginTop: 16 }}>
        <div>Symbol: {tick?.symbol ?? "-"}</div>
        <div>Price: {tick ? tick.price.toFixed(2) : "-"}</div>
        <div>Time: {tick?.ts ?? "-"}</div>
      </div>
    </div>
  );
}