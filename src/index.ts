import { DEFAULT_PORT } from "./config/constants.js";
import { buildServer } from "./server.js";

const app = await buildServer();

try {
  await app.listen({ host: "0.0.0.0", port: DEFAULT_PORT });
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "shutting down");
  try {
    await app.close();
    app.log.info("shutdown complete");
    process.exit(0);
  } catch (err) {
    app.log.error(err, "error during shutdown");
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
