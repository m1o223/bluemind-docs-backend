import { config } from "../config/env.js";
import { createDatabase, migrateDatabase } from "./database.js";

const db = createDatabase(config.databasePath);
migrateDatabase(db);
db.close();
console.log(`Database migrated at ${config.databasePath}`);
