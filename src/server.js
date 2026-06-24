import { mkdirSync } from "node:fs";
import { config } from "./config/env.js";
import { createDatabase, migrateDatabase } from "./db/database.js";
import { createLogger } from "./utils/logger.js";
import { createApp } from "./app.js";

mkdirSync(config.imageStorageRoot, { recursive: true });

const logger = createLogger(config.logLevel);
const db = createDatabase(config.databasePath);
migrateDatabase(db);

const server = createApp({ db, config, logger });

server.listen(config.port, config.host, () => {
  logger.info("BlueMind Docs backend started", {
    host: config.host,
    port: config.port,
    databasePath: config.databasePath,
    imageStorageRoot: config.imageStorageRoot
  });
});

function shutdown(signal) {
  logger.info("shutdown requested", { signal });
  server.close(() => {
    db.close();
    logger.info("shutdown complete");
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
