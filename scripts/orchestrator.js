import { fork } from "node:child_process";
import { readFileSync } from "node:fs";

const config = JSON.parse(
  readFileSync(new URL("../trading-bot/config/default.json", import.meta.url), "utf8")
);
const persistence = config.persistence;

let restartCount = 0;
let botProcess = null;

function log(msg) {
  console.log(`[orchestrator] ${new Date().toISOString()} ${msg}`);
}

function startBot() {
  log(`Starting bot (attempt ${restartCount + 1})...`);

  botProcess = fork(new URL("../trading-bot/src/index.js", import.meta.url), [], {
    stdio: "inherit",
    env: { ...process.env },
  });

  botProcess.on("exit", (code) => {
    log(`Bot exited with code ${code}`);
    botProcess = null;

    if (!persistence.restartOnCrash) {
      log("Restart disabled — exiting.");
      process.exit(code ?? 1);
    }

    restartCount++;
    if (restartCount > persistence.maxRestarts) {
      log(`Max restarts (${persistence.maxRestarts}) exceeded — exiting.`);
      process.exit(1);
    }

    log(`Restarting in ${persistence.restartDelayMs}ms...`);
    setTimeout(startBot, persistence.restartDelayMs);
  });

  botProcess.on("error", (err) => {
    log(`Bot process error: ${err.message}`);
  });
}

function heartbeat() {
  setInterval(() => {
    const alive = botProcess !== null && !botProcess.killed;
    log(`Heartbeat — bot alive: ${alive} | restarts: ${restartCount} | uptime: ${Math.floor(process.uptime())}s`);
    if (!alive && restartCount <= persistence.maxRestarts) {
      log("Bot not alive — triggering restart");
      startBot();
    }
  }, persistence.heartbeatIntervalMs);
}

process.on("SIGINT", () => {
  log("SIGINT received — shutting down gracefully");
  if (botProcess) botProcess.kill("SIGTERM");
  setTimeout(() => process.exit(0), 2000);
});

process.on("SIGTERM", () => {
  log("SIGTERM received — shutting down");
  if (botProcess) botProcess.kill("SIGTERM");
  setTimeout(() => process.exit(0), 2000);
});

log("=== CactusCash Orchestrator ===");
log(`Max restarts: ${persistence.maxRestarts} | Restart delay: ${persistence.restartDelayMs}ms`);
startBot();
heartbeat();
