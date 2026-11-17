import { mkdir } from "node:fs/promises";
import { dirname, resolve, isAbsolute } from "node:path";
import { DatabaseSync } from "node:sqlite";
const url = process.env.DATABASE_URL;
if (!url?.startsWith("file:"))
  throw new Error("DATABASE_URL must be a persistent SQLite file URL.");
const raw = url.slice(5),
  path = isAbsolute(raw) ? raw : resolve("prisma", raw);
await mkdir(dirname(path), { recursive: true });
const db = new DatabaseSync(path);
db.close();
console.log("SQLite storage prepared.");
