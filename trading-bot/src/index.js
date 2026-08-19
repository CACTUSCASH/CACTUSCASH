import { readFileSync } from "node:fs";
import { TradingBot } from "./bot.js";
import { FlipperBridge } from "./flipper-bridge.js";
import { Dashboard } from "../dashboard/server.js";

const config = JSON.parse(readFileSync(new URL("../config/default.json", import.meta.url), "utf8"));

async function createExchange(cfg) {
  const ccxt = await import("ccxt");
  const ExchangeClass = ccxt.default[cfg.id] ?? ccxt[cfg.id];
  if (!ExchangeClass) throw new Error(`Exchange "${cfg.id}" not found in ccxt`);

  const exchange = new ExchangeClass({
    apiKey: process.env.EXCHANGE_API_KEY ?? "",
    secret: process.env.EXCHANGE_API_SECRET ?? "",
    enableRateLimit: true,
    rateLimit: cfg.rateLimit,
  });

  if (cfg.sandbox) exchange.setSandbox(true);
  return exchange;
}

async function main() {
  console.log("=== CactusCash Trading Bot ===");
  console.log(`Symbol: ${config.bot.symbol} | Strategy: ${config.bot.strategy}`);
  console.log(`Paper trading: ${config.bot.paperTrading}`);

  const exchange = await createExchange(config.exchange);
  const bot = new TradingBot(exchange, config.bot);
  const flipper = new FlipperBridge(config.flipper);
  const dashboard = new Dashboard(config.dashboard, bot, flipper);

  flipper.on("connected", () => console.log("[flipper] Connected"));
  flipper.on("disconnected", () => console.log("[flipper] Disconnected"));
  flipper.on("error", (e) => console.log(`[flipper] ${e}`));
  flipper.on("signal", (s) => console.log(`[flipper] Signal: ${JSON.stringify(s)}`));
  flipper.on("button", (b) => {
    console.log(`[flipper] Button: ${b}`);
    if (b === "BACK_LONG") {
      console.log("[flipper] Emergency stop triggered");
      bot.stop();
    }
  });

  bot.on("started", (info) => console.log(`[bot] Started — ${info.symbol} / ${info.strategy}`));
  bot.on("trade", (t) => {
    console.log(`[bot] ${t.side.toUpperCase()} ${t.symbol} @ ${t.price}`);
    flipper.notifyTrade(t);
  });
  bot.on("stop-loss", (sl) => console.log(`[bot] Stop-loss hit @ ${sl.price}`));
  bot.on("take-profit", (tp) => console.log(`[bot] Take-profit hit @ ${tp.price}`));
  bot.on("tick", (data) => dashboard.broadcast(data));
  bot.on("error", (e) => console.log(`[bot] Error: ${e}`));

  await flipper.connect();
  await dashboard.start();
  await bot.start();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
