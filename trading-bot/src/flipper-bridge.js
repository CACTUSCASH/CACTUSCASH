import { EventEmitter } from "node:events";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export class FlipperBridge extends EventEmitter {
  #port = null;
  #config;
  #connected = false;
  #buffer = "";

  constructor(config) {
    super();
    this.#config = config;
  }

  async connect() {
    try {
      const { SerialPort } = require("serialport");
      this.#port = new SerialPort({
        path: this.#config.serialPort,
        baudRate: this.#config.baudRate,
        autoOpen: false,
      });

      return new Promise((resolve, reject) => {
        this.#port.open((err) => {
          if (err) {
            this.emit("error", `Flipper connect failed: ${err.message}`);
            return reject(err);
          }
          this.#connected = true;
          this.emit("connected");
          this.#listen();
          resolve();
        });
      });
    } catch (err) {
      this.emit(
        "error",
        `SerialPort not available (running without Flipper): ${err.message}`
      );
      this.#connected = false;
    }
  }

  #listen() {
    if (!this.#port) return;
    this.#port.on("data", (chunk) => {
      this.#buffer += chunk.toString();
      const lines = this.#buffer.split("\n");
      this.#buffer = lines.pop() ?? "";
      for (const line of lines) {
        this.#parseFlipperMessage(line.trim());
      }
    });
    this.#port.on("error", (err) => this.emit("error", err.message));
    this.#port.on("close", () => {
      this.#connected = false;
      this.emit("disconnected");
    });
  }

  #parseFlipperMessage(msg) {
    if (msg.startsWith("SIGNAL:")) {
      this.emit("signal", { type: "subghz", raw: msg.slice(7) });
    } else if (msg.startsWith("BTN:")) {
      this.emit("button", msg.slice(4));
    } else if (msg.startsWith("STATUS:")) {
      this.emit("status", msg.slice(7));
    }
  }

  async sendCommand(cmd) {
    if (!this.#port || !this.#connected) return false;
    return new Promise((resolve) => {
      this.#port.write(`${cmd}\r\n`, (err) => resolve(!err));
    });
  }

  async notifyTrade(trade) {
    if (!this.#config.notifyOnTrade) return;

    if (this.#config.ledFeedback) {
      const color = trade.side === "buy" ? "green" : "red";
      await this.sendCommand(`led ${color} 500`);
    }

    const msg = `${trade.side.toUpperCase()} ${trade.symbol} @ ${trade.price}`;
    await this.sendCommand(`notify "${msg}"`);
    this.emit("trade-notified", trade);
  }

  async startSignalCapture() {
    await this.sendCommand("subghz rx");
    this.emit("capture-started");
  }

  get connected() {
    return this.#connected;
  }

  async disconnect() {
    if (this.#port && this.#connected) {
      this.#port.close();
    }
  }
}
