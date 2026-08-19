import { EventEmitter } from "node:events";

export class TradingBot extends EventEmitter {
  #exchange;
  #config;
  #running = false;
  #position = null;
  #cooldownUntil = 0;
  #stats = { trades: 0, wins: 0, losses: 0, pnl: 0 };

  constructor(exchange, config) {
    super();
    this.#exchange = exchange;
    this.#config = config;
  }

  async start() {
    this.#running = true;
    this.emit("started", { symbol: this.#config.symbol, strategy: this.#config.strategy });

    while (this.#running) {
      try {
        await this.#tick();
      } catch (err) {
        this.emit("error", err.message);
      }
      await this.#sleep(this.#timeframeMs());
    }
  }

  stop() {
    this.#running = false;
    this.emit("stopped", this.#stats);
  }

  async #tick() {
    const candles = await this.#exchange.fetchOHLCV(
      this.#config.symbol,
      this.#config.timeframe,
      undefined,
      100
    );

    const closes = candles.map((c) => c[4]);
    const signal = this.#evaluateStrategy(closes);

    if (Date.now() < this.#cooldownUntil) return;

    if (signal === "buy" && !this.#position) {
      await this.#openPosition("buy", closes.at(-1));
    } else if (signal === "sell" && this.#position) {
      await this.#closePosition(closes.at(-1));
    }

    if (this.#position) {
      this.#checkStopLossTakeProfit(closes.at(-1));
    }

    this.emit("tick", {
      price: closes.at(-1),
      signal,
      position: this.#position,
      stats: { ...this.#stats },
    });
  }

  #evaluateStrategy(closes) {
    switch (this.#config.strategy) {
      case "ema-crossover":
        return this.#emaCrossover(closes);
      case "rsi-reversal":
        return this.#rsiReversal(closes);
      case "macd-momentum":
        return this.#macdMomentum(closes);
      default:
        return null;
    }
  }

  #emaCrossover(closes) {
    const fast = this.#ema(closes, 9);
    const slow = this.#ema(closes, 21);
    if (fast.length < 2 || slow.length < 2) return null;

    const prevFast = fast.at(-2), prevSlow = slow.at(-2);
    const curFast = fast.at(-1), curSlow = slow.at(-1);

    if (prevFast <= prevSlow && curFast > curSlow) return "buy";
    if (prevFast >= prevSlow && curFast < curSlow) return "sell";
    return null;
  }

  #rsiReversal(closes) {
    const rsi = this.#rsi(closes, 14);
    if (rsi.length < 1) return null;
    const val = rsi.at(-1);
    if (val < 30) return "buy";
    if (val > 70) return "sell";
    return null;
  }

  #macdMomentum(closes) {
    const fast = this.#ema(closes, 12);
    const slow = this.#ema(closes, 26);
    const minLen = Math.min(fast.length, slow.length);
    if (minLen < 2) return null;

    const macdLine = fast.slice(-minLen).map((f, i) => f - slow.slice(-minLen)[i]);
    const signal = this.#ema(macdLine, 9);
    if (signal.length < 2) return null;

    const prevHist = macdLine.at(-2) - signal.at(-2);
    const curHist = macdLine.at(-1) - signal.at(-1);

    if (prevHist < 0 && curHist > 0) return "buy";
    if (prevHist > 0 && curHist < 0) return "sell";
    return null;
  }

  async #openPosition(side, price) {
    const balance = this.#config.paperTrading
      ? { free: 10000 }
      : await this.#exchange.fetchBalance();

    const amount = (balance.free * this.#config.maxPositionPct) / price;

    if (this.#config.paperTrading) {
      this.#position = { side, entryPrice: price, amount, openedAt: Date.now() };
    } else {
      const order = await this.#exchange.createMarketOrder(
        this.#config.symbol, side, amount
      );
      this.#position = { side, entryPrice: order.average, amount: order.filled, openedAt: Date.now() };
    }

    this.#stats.trades++;
    this.#cooldownUntil = Date.now() + this.#config.cooldownMs;
    this.emit("trade", { side: "buy", symbol: this.#config.symbol, price, amount: this.#position.amount });
  }

  async #closePosition(price) {
    const pnl = (price - this.#position.entryPrice) * this.#position.amount;
    this.#stats.pnl += pnl;
    if (pnl > 0) this.#stats.wins++;
    else this.#stats.losses++;

    if (!this.#config.paperTrading) {
      await this.#exchange.createMarketOrder(
        this.#config.symbol, "sell", this.#position.amount
      );
    }

    this.emit("trade", { side: "sell", symbol: this.#config.symbol, price, pnl });
    this.#position = null;
    this.#cooldownUntil = Date.now() + this.#config.cooldownMs;
  }

  #checkStopLossTakeProfit(price) {
    if (!this.#position) return;
    const entry = this.#position.entryPrice;
    const changePct = (price - entry) / entry;

    if (changePct <= -this.#config.stopLossPct) {
      this.emit("stop-loss", { price, entry, changePct });
      this.#closePosition(price);
    } else if (changePct >= this.#config.takeProfitPct) {
      this.emit("take-profit", { price, entry, changePct });
      this.#closePosition(price);
    }
  }

  #ema(data, period) {
    if (data.length < period) return [];
    const k = 2 / (period + 1);
    const result = [data.slice(0, period).reduce((a, b) => a + b) / period];
    for (let i = period; i < data.length; i++) {
      result.push(data[i] * k + result.at(-1) * (1 - k));
    }
    return result;
  }

  #rsi(data, period) {
    if (data.length < period + 1) return [];
    const changes = data.slice(1).map((v, i) => v - data[i]);
    let avgGain = 0, avgLoss = 0;
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss -= changes[i];
    }
    avgGain /= period;
    avgLoss /= period;
    const result = [100 - 100 / (1 + avgGain / (avgLoss || 1))];
    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0;
      const loss = changes[i] < 0 ? -changes[i] : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      result.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
    }
    return result;
  }

  #timeframeMs() {
    const map = { "1m": 60000, "5m": 300000, "15m": 900000, "1h": 3600000, "4h": 14400000 };
    return map[this.#config.timeframe] ?? 300000;
  }

  #sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  get stats() { return { ...this.#stats }; }
  get position() { return this.#position ? { ...this.#position } : null; }
  get running() { return this.#running; }
}
