import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const sha256 = (v: string | Buffer) =>
  createHash("sha256").update(v).digest("hex");
export async function jsonBody(req: Request, max = 32768) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON content.");
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.SITE_URL || req.url).origin;
  if (!origin || origin !== expected)
    throw new HttpError(403, "Request origin is not allowed.");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Cross-site request rejected.");
}
export function clientKey(req: Request) {
  // Only trust an address header explicitly configured by a trusted reverse proxy.
  const address = process.env.TRUSTED_IP_HEADER
    ? req.headers.get(process.env.TRUSTED_IP_HEADER) || "unknown"
    : "shared";
  return createHmac(
    "sha256",
    process.env.IP_HASH_SECRET || "local-development-only",
  )
    .update(address)
    .digest("hex");
}
export async function limit(key: string, max: number, minutes: number) {
  const now = new Date();
  const row = await db.rateLimit.upsert({
    where: { id: key },
    create: { id: key, count: 1, expiresAt: new Date(+now + minutes * 60000) },
    update: { count: { increment: 1 } },
  });
  if (row.expiresAt < now) {
    await db.rateLimit.update({
      where: { id: key },
      data: { count: 1, expiresAt: new Date(+now + minutes * 60000) },
    });
    return;
  }
  if (row.count > max)
    throw new HttpError(429, "Too many attempts. Please try again later.");
}
export async function admin() {
  const token = (await cookies()).get("jazba_admin")?.value;
  if (!token) throw new HttpError(401, "Please sign in.");
  const session = await db.adminSession.findUnique({
    where: { id: sha256(token) },
    include: { admin: true },
  });
  if (
    !session ||
    session.expiresAt < new Date() ||
    session.admin.role !== "ADMIN"
  )
    throw new HttpError(401, "Session expired. Please sign in.");
  return session.admin;
}
export async function newSession(adminId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 3600000);
  await db.adminSession.create({
    data: { id: sha256(token), adminId, expiresAt },
  });
  (await cookies()).set("jazba_admin", token, {
    httpOnly: true,
    secure:
      process.env.COOKIE_SECURE === "true" ||
      process.env.SITE_URL?.startsWith("https://") === true,
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}
export const audit = (
  administratorId: string,
  action: string,
  entityType: string,
  entityId: string,
) =>
  db.auditLog.create({
    data: { administratorId, action, entityType, entityId },
  });
export function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid request." }, { status: 400 });
  console.error(
    "Request failed",
    error instanceof Error ? error.message : "unknown",
  );
  return Response.json(
    { error: "Unable to complete this request. Please try again." },
    { status: 500 },
  );
}
