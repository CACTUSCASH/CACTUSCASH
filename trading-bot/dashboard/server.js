import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { WebSocketServer } from "ws";
import { EventEmitter } from "node:events";

export class Dashboard extends EventEmitter {
  #httpServer;
  #wss;
  #bot;
  #flipper;
  #config;
  #clients = new Set();

  constructor(config, bot, flipper) {
    super();
    this.#config = config;
    this.#bot = bot;
    this.#flipper = flipper;
  }

  async start() {
    this.#httpServer = createServer((req, res) => {
      if (req.url === "/api/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          bot: { running: this.#bot.running, stats: this.#bot.stats, position: this.#bot.position },
          flipper: { connected: this.#flipper.connected },
          uptime: process.uptime(),
        }));
        return;
      }
      if (req.url === "/api/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ts: Date.now() }));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(this.#html());
    });

    this.#wss = new WebSocketServer({ port: this.#config.wsPort });
    this.#wss.on("connection", (ws) => {
      this.#clients.add(ws);
      ws.send(JSON.stringify({
        type: "init",
        stats: this.#bot.stats,
        position: this.#bot.position,
        flipper: this.#flipper.connected,
      }));
      ws.on("close", () => this.#clients.delete(ws));
    });

    return new Promise((resolve) => {
      this.#httpServer.listen(this.#config.port, () => {
        console.log(`[dashboard] http://localhost:${this.#config.port}`);
        console.log(`[dashboard] WebSocket ws://localhost:${this.#config.wsPort}`);
        resolve();
      });
    });
  }

  broadcast(data) {
    const msg = JSON.stringify({ type: "tick", ...data, ts: Date.now() });
    for (const ws of this.#clients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  #html() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CactusCash Trading Dashboard</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a0a;color:#e0e0e0;padding:24px}
h1{font-size:1.5rem;color:#22c55e;margin-bottom:16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px}
.card h2{font-size:.75rem;text-transform:uppercase;color:#888;margin-bottom:8px}
.card .val{font-size:1.8rem;font-weight:700}
.positive{color:#22c55e}.negative{color:#ef4444}
#log{background:#111;border:1px solid #333;border-radius:8px;padding:16px;height:300px;overflow-y:auto;font-family:monospace;font-size:.8rem;line-height:1.6}
.flipper-status{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
.flipper-on{background:#22c55e}.flipper-off{background:#ef4444}
</style>
</head>
<body>
<h1>CactusCash Trading Bot</h1>
<div class="grid">
  <div class="card"><h2>Price</h2><div class="val" id="price">—</div></div>
  <div class="card"><h2>P&L</h2><div class="val" id="pnl">$0.00</div></div>
  <div class="card"><h2>Trades</h2><div class="val" id="trades">0</div></div>
  <div class="card"><h2>Win Rate</h2><div class="val" id="winrate">—</div></div>
  <div class="card"><h2>Position</h2><div class="val" id="position">None</div></div>
  <div class="card"><h2>Flipper</h2><div class="val"><span class="flipper-status flipper-off" id="flipper-dot"></span><span id="flipper-text">Disconnected</span></div></div>
</div>
<div id="log"></div>
<script>
const ws = new WebSocket("ws://"+location.hostname+":${this.#config.wsPort}");
const $ = id => document.getElementById(id);
const log = msg => { const d=$("log"); d.innerHTML += msg+"\\n"; d.scrollTop=d.scrollHeight; };
ws.onmessage = e => {
  const d = JSON.parse(e.data);
  if(d.type==="init"||d.type==="tick"){
    if(d.price) $("price").textContent = "$"+Number(d.price).toLocaleString(undefined,{minimumFractionDigits:2});
    if(d.stats){
      const s=d.stats;
      $("pnl").textContent = "$"+s.pnl.toFixed(2);
      $("pnl").className = "val "+(s.pnl>=0?"positive":"negative");
      $("trades").textContent = s.trades;
      $("winrate").textContent = s.trades ? (s.wins/s.trades*100).toFixed(1)+"%":"—";
    }
    if(d.position) $("position").textContent = d.position.side.toUpperCase()+" @ $"+d.position.entryPrice.toFixed(2);
    else $("position").textContent = "None";
    if(d.flipper!==undefined){
      $("flipper-dot").className = "flipper-status "+(d.flipper?"flipper-on":"flipper-off");
      $("flipper-text").textContent = d.flipper?"Connected":"Disconnected";
    }
    if(d.signal) log(new Date().toLocaleTimeString()+" | signal: "+d.signal+" | price: $"+(d.price||0).toFixed(2));
  }
};
ws.onclose = () => log("WebSocket disconnected — reconnecting...");
</script>
</body>
</html>`;
  }
}
