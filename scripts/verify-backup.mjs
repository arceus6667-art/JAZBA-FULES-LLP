import { readFile, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
const folder = process.argv[2];
if (!folder)
  throw new Error(
    "Usage: node scripts/verify-backup.mjs <extracted-private-folder>",
  );
const root = resolve(folder),
  manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
for (const [file, expected] of Object.entries(manifest.files)) {
  const path = resolve(root, file);
  if (!path.startsWith(root + sep)) throw new Error("Invalid manifest path.");
  const actual = createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
  if (actual !== expected) throw new Error(`Checksum mismatch: ${file}`);
}
if (!manifest.files["jazba.db"]) throw new Error("Missing database checksum.");
const db = new DatabaseSync(resolve(root, "jazba.db"), { readOnly: true });
if (Object.values(db.prepare("PRAGMA integrity_check").get())[0] !== "ok")
  throw new Error("Database integrity check failed.");
for (const file of db
  .prepare("SELECT storedName, checksum FROM StoredFile")
  .all())
  if (manifest.files[`files/${file.storedName}`] !== file.checksum)
    throw new Error("Backup has missing file metadata.");
db.close();
console.log(
  `Backup verified. Created at ${manifest.createdAt}. ${Object.keys(manifest.files).length} checksums passed.`,
);
