import { mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { db } from "./db";
import { HttpError, sha256 } from "./security";
export const run = promisify(execFile);
export const storageDir = () =>
  resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR || "./storage");
export async function limitedBody(req: Request, max: number) {
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "File required.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      throw new HttpError(413, "Upload exceeds the 50 MB limit.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export async function storeFile(req: Request) {
  const body = await limitedBody(req, 51 * 1024 * 1024);
  const form = await new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": req.headers.get("content-type") || "" },
    body,
  }).formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Choose a file.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const apk = file.name.toLowerCase().endsWith(".apk");
  let mime = "",
    extension = "";
  if (
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    mime = "image/png";
    extension = ".png";
  } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    mime = "image/jpeg";
    extension = ".jpg";
  } else if (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    mime = "image/webp";
    extension = ".webp";
  } else if (apk && bytes[0] === 80 && bytes[1] === 75) {
    mime = "application/vnd.android.package-archive";
    extension = ".apk";
  } else
    throw new HttpError(
      400,
      "Only JPEG, PNG, WebP, and signed Android APK files are accepted.",
    );
  if (bytes.length > (apk ? 50 : 5) * 1024 * 1024)
    throw new HttpError(
      413,
      apk ? "APK limit is 50 MB." : "Image limit is 5 MB.",
    );
  await mkdir(storageDir(), { recursive: true });
  const storedName = randomUUID() + extension,
    path = join(/* turbopackIgnore: true */ storageDir(), storedName);
  await writeFile(path, bytes, { flag: "wx", mode: 0o600 });
  try {
    let verificationNote = "Image header validated";
    if (apk) {
      const expected = process.env.APK_CERT_SHA256?.replaceAll(
        ":",
        "",
      ).toLowerCase();
      if (!expected || !/^[a-f0-9]{64}$/.test(expected))
        throw new HttpError(
          503,
          "Configure the official APK signing certificate fingerprint before uploading an APK.",
        );
      try {
        await run(
          process.env.CLAMSCAN_PATH || "clamscan",
          ["--no-summary", path],
          { timeout: 120000, maxBuffer: 1024 * 1024 },
        );
        const { stdout } = await run(
          process.env.APKSIGNER_PATH || "apksigner",
          ["verify", "--verbose", "--print-certs", path],
          { timeout: 30000, maxBuffer: 1024 * 1024 },
        );
        const certs = [
          ...stdout.matchAll(/certificate SHA-256 digest:\s*([a-f0-9:]+)/gi),
        ].map((m) => m[1].replaceAll(":", "").toLowerCase());
        if (!certs.length || !certs.includes(expected))
          throw new Error("Signature mismatch");
        verificationNote =
          "ClamAV scan passed; apksigner verification passed; official certificate matched";
      } catch {
        throw new HttpError(
          422,
          "APK verification failed. Ensure ClamAV and apksigner are installed and the official signing certificate matches.",
        );
      }
    } else {
      const sharp = (await import("sharp")).default;
      const metadata = await sharp(bytes, {
        limitInputPixels: 40000000,
      }).metadata();
      if (!metadata.width || !metadata.height)
        throw new HttpError(400, "Invalid image.");
    }
    return await db.storedFile.create({
      data: {
        originalName: file.name.slice(0, 160),
        storedName,
        mime,
        size: bytes.length,
        checksum: sha256(bytes),
        verified: true,
        verificationNote,
      },
    });
  } catch (e) {
    await rm(path, { force: true });
    throw e;
  }
}
export async function makeBackup() {
  const folder = join(tmpdir(), `jazba-${randomUUID()}`);
  await mkdir(folder, { recursive: true });
  try {
    const snapshot = join(folder, "jazba.db");
    // Random server-controlled path, never supplied by a client.
    await db.$executeRawUnsafe(
      `VACUUM INTO '${snapshot.replaceAll("'", "''")}'`,
    );
    const { DatabaseSync } = await import("node:sqlite");
    const check = new DatabaseSync(snapshot, { readOnly: true });
    const result = check.prepare("PRAGMA integrity_check").get();
    const snapshotFiles = check
      .prepare("SELECT storedName, checksum FROM StoredFile")
      .all() as { storedName: string; checksum: string }[];
    check.close();
    if (!result || Object.values(result)[0] !== "ok")
      throw new Error("Backup integrity check failed");
    await mkdir(join(folder, "files"), { recursive: true });
    const manifest: { createdAt: string; files: Record<string, string> } = {
      createdAt: new Date().toISOString(),
      files: { "jazba.db": sha256(await readFile(snapshot)) },
    };
    for (const f of snapshotFiles) {
      const bytes = await readFile(
        /* turbopackIgnore: true */ join(
          /* turbopackIgnore: true */ storageDir(),
          f.storedName,
        ),
      );
      if (sha256(bytes) !== f.checksum)
        throw new Error("Stored file integrity check failed");
      await writeFile(join(folder, "files", f.storedName), bytes);
      manifest.files[`files/${f.storedName}`] = f.checksum;
    }
    await writeFile(
      join(folder, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    const archive = join(folder, "backup.tar.gz");
    await run("tar", [
      "-czf",
      archive,
      "-C",
      folder,
      "jazba.db",
      "files",
      "manifest.json",
    ]);
    return await readFile(archive);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
