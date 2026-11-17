import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const root = await mkdtemp(resolve(".test-runtime-"));
const port = 3107,
  base = `http://localhost:${port}`,
  email = "test-admin@example.invalid",
  password = randomBytes(24).toString("hex");
const env = {
  ...process.env,
  DATABASE_URL: `file:${join(root, "test.db").replaceAll("\\", "/")}`,
  SITE_URL: base,
  STORAGE_DIR: join(root, "files"),
  IP_HASH_SECRET: randomBytes(32).toString("hex"),
  NODE_ENV: "production",
  COOKIE_SECURE: "false",
  APK_CERT_SHA256: "",
};
let db,
  server,
  cookie = "",
  messageId = "",
  announcementId = "",
  releaseId = "",
  fileId = "",
  logs = "";
function launch() {
  server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "-p",
      String(port),
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.on("data", (d) => (logs += d));
  server.stderr.on("data", (d) => (logs += d));
}
async function ready() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Server did not start: " + logs);
}
async function request(
  path,
  { method = "GET", body, auth = false, headers = {} } = {},
) {
  const r = await fetch(base + path, {
    method,
    headers: {
      origin: base,
      ...(auth ? { cookie } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  return r;
}
before(async () => {
  execFileSync(process.execPath, ["scripts/prepare-db.mjs"], {
    env,
    stdio: "pipe",
  });
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env, stdio: "pipe" },
  );
  db = new PrismaClient({ datasourceUrl: env.DATABASE_URL });
  const salt = randomBytes(16).toString("hex");
  await db.adminUser.create({
    data: {
      email,
      passwordHash: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
    },
  });
  launch();
  await ready();
});
after(async () => {
  if (server) {
    server.kill();
    await new Promise((r) => server.once("exit", r));
  }
  await db?.$disconnect();
  if (root.startsWith(resolve(".test-runtime-")))
    await rm(root, { recursive: true, force: true });
});
test("public pages and exact original branding are served", async () => {
  const r = await fetch(base),
    html = await r.text();
  assert.equal(r.status, 200);
  assert.match(html, /Doorstep/);
  assert.match(html, /Asmita J Angare/);
  assert.doesNotMatch(html, /test-admin@example/);
  for (const path of [
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
    "/brand/logo-original.jpeg",
    "/brand/truck-original.jpeg",
  ])
    assert.equal((await fetch(base + path)).status, 200, path);
});
test("private APIs reject unauthenticated access and cross-origin mutation", async () => {
  for (const path of [
    "/api/admin/messages",
    "/api/admin/analytics",
    "/api/admin/backup",
    "/api/admin/files",
  ])
    assert.equal((await request(path)).status, 401, path);
  assert.equal(
    (
      await request("/api/contact", {
        method: "POST",
        body: {},
        headers: { origin: "https://untrusted.invalid" },
      })
    ).status,
    403,
  );
});
test("contact validation, consent, honeypot and confirmed persistent storage", async () => {
  const input = {
    fullName: "Integration test",
    email: "inquiry@example.invalid",
    companyName: "Test organisation",
    contactNumber: "+91 9000000000",
    subject: "Integration inquiry",
    message: "This is a disposable automated integration test.",
    consent: true,
    website: "",
  };
  assert.equal(
    (
      await request("/api/contact", {
        method: "POST",
        body: { ...input, consent: false },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/contact", {
        method: "POST",
        body: { ...input, email: "invalid" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/contact", {
        method: "POST",
        body: { ...input, website: "spam" },
      })
    ).status,
    400,
  );
  const r = await request("/api/contact", { method: "POST", body: input });
  assert.equal(r.status, 201);
  const value = await r.json();
  messageId = value.id;
  assert.match(value.message, /Thank you/);
  assert.equal(
    (await db.corporateMessage.findUnique({ where: { id: messageId } }))
      .subject,
    input.subject,
  );
});
test("admin login has HTTP-only session and does not expose passwords", async () => {
  assert.equal(
    (
      await request("/api/admin/login", {
        method: "POST",
        body: { email, password: "incorrect" },
      })
    ).status,
    401,
  );
  const r = await request("/api/admin/login", {
    method: "POST",
    body: { email, password },
  });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(r.headers.get("set-cookie"), /SameSite=strict/i);
  cookie = r.headers.get("set-cookie").split(";")[0];
  const session = await (
    await request("/api/admin/session", { auth: true })
  ).json();
  assert.equal(session.email, email);
  assert.equal(session.passwordHash, undefined);
});
test("message search, status, private notes, selected CSV and formula neutralisation", async () => {
  let r = await request("/api/admin/messages?q=Test&status=New", {
    auth: true,
  });
  assert.equal((await r.json()).total, 1);
  r = await request(`/api/admin/messages/${messageId}`, {
    method: "PATCH",
    auth: true,
    body: { status: "Resolved", administrativeNotes: "=SUM(A1:A3)" },
  });
  assert.equal(r.status, 200);
  r = await request(`/api/admin/messages-export?id=${messageId}`, {
    auth: true,
  });
  const csv = await r.text();
  assert.match(csv, /Resolved/);
  assert.match(csv, /'=SUM/);
  assert.equal(
    (await request("/api/admin/messages?from=bad", { auth: true })).status,
    400,
  );
});
test("analytics is consent-based, records real events and respects DNT", async () => {
  const headers = {
    "user-agent": "Mozilla/5.0 Chrome/130.0.0.0 Windows NT 10.0",
    cookie: "jazba_analytics_consent=yes",
  };
  await request("/api/analytics", { method: "POST", body: { path: "/" } });
  assert.equal(await db.pageView.count(), 0);
  await request("/api/analytics", {
    method: "POST",
    body: { path: "/" },
    headers: { ...headers, dnt: "1" },
  });
  assert.equal(await db.pageView.count(), 0);
  const r = await request("/api/analytics", {
    method: "POST",
    body: { path: "/", referrer: "https://example.org/article" },
    headers,
  });
  assert.equal(r.status, 204);
  assert.equal(await db.pageView.count(), 1);
  const analytics = await (
    await request("/api/admin/analytics", { auth: true })
  ).json();
  assert.equal(analytics.pageViews, 1);
  assert.equal(analytics.uniqueVisitors, 1);
  assert.equal(analytics.devices[0].name, "Desktop");
  assert.equal(analytics.referrers[0].name, "example.org");
  assert.equal(
    (
      await request("/api/analytics", {
        method: "POST",
        body: { path: "/admin" },
        headers,
      })
    ).status,
    400,
  );
});
test("private image upload, publication and unpublication protect file visibility", async () => {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [await readFile("public/brand/logo-original.jpeg")],
      "test-logo.jpeg",
      { type: "image/jpeg" },
    ),
  );
  let r = await request("/api/admin/upload", {
    method: "POST",
    auth: true,
    body: form,
  });
  assert.equal(r.status, 201);
  const file = await r.json();
  fileId = file.id;
  assert.equal(file.verified, true);
  assert.match(file.checksum, /^[a-f0-9]{64}$/);
  assert.equal((await request(`/api/media/${fileId}`)).status, 401);
  const body = {
    title: "Disposable test announcement",
    description: "This content is used only for integration testing.",
    category: "Corporate update",
    imagePath: `/api/media/${fileId}`,
    status: "Draft",
  };
  assert.equal(
    (
      await request("/api/admin/announcements", {
        method: "POST",
        auth: true,
        body,
      })
    ).status,
    200,
  );
  announcementId = (await db.announcement.findFirst()).id;
  assert.doesNotMatch(
    await (await fetch(base)).text(),
    /Disposable test announcement/,
  );
  assert.equal(
    (
      await request(`/api/admin/announcements/${announcementId}`, {
        method: "PATCH",
        auth: true,
        body: { ...body, status: "Published" },
      })
    ).status,
    200,
  );
  assert.match(
    await (await fetch(base)).text(),
    /Disposable test announcement/,
  );
  assert.equal((await request(`/api/media/${fileId}`)).status, 200);
  await request(`/api/admin/announcements/${announcementId}`, {
    method: "PATCH",
    auth: true,
    body: { ...body, status: "Archived" },
  });
  assert.equal((await request(`/api/media/${fileId}`)).status, 401);
});
test("application drafts, dynamic status, release gate and invalid APK rejection", async () => {
  const body = {
    applicationName: "Jazba Fuels",
    version: "test-1",
    description: "Disposable planned app announcement.",
    releaseNotes: "Testing publication flow.",
    releaseStatus: "Under Development",
    publicationStatus: "Draft",
    fileId: null,
    iconPath: "",
    screenshotPaths: [],
    releaseDate: null,
  };
  assert.equal(
    (await request("/api/admin/releases", { method: "POST", auth: true, body }))
      .status,
    200,
  );
  releaseId = (await db.applicationRelease.findFirst()).id;
  assert.equal(
    (
      await request(`/api/admin/releases/${releaseId}`, {
        method: "PATCH",
        auth: true,
        body: {
          ...body,
          releaseStatus: "Released",
          publicationStatus: "Published",
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request(`/api/admin/releases/${releaseId}`, {
        method: "PATCH",
        auth: true,
        body: { ...body, publicationStatus: "Published" },
      })
    ).status,
    200,
  );
  assert.match(await (await fetch(base)).text(), /Under Development/);
  const form = new FormData();
  form.set(
    "file",
    new File([Buffer.from("PK-disposable-invalid-apk")], "test.apk"),
  );
  assert.equal(
    (
      await request("/api/admin/upload", {
        method: "POST",
        auth: true,
        body: form,
      })
    ).status,
    503,
  );
});
test("settings validation, protected backups and checksum verification", async () => {
  assert.equal(
    (
      await request("/api/admin/settings", {
        method: "POST",
        auth: true,
        body: { contactEmail: "invalid" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/api/admin/settings", {
        method: "POST",
        auth: true,
        body: { maintenanceNotice: "Disposable integration notice" },
      })
    ).status,
    200,
  );
  assert.match(
    await (await fetch(base)).text(),
    /Disposable integration notice/,
  );
  const r = await request("/api/admin/backup", { auth: true });
  assert.equal(r.status, 200);
  const archive = join(root, "backup.tar.gz");
  await writeFile(archive, Buffer.from(await r.arrayBuffer()));
  const folder = join(root, "extracted");
  await mkdir(folder);
  execFileSync("tar", ["-xzf", archive, "-C", folder]);
  const output = execFileSync(
    process.execPath,
    ["scripts/verify-backup.mjs", folder],
    { encoding: "utf8" },
  );
  assert.match(output, /Backup verified/);
  await writeFile(join(folder, "jazba.db"), "tampered");
  assert.throws(() =>
    execFileSync(process.execPath, ["scripts/verify-backup.mjs", folder], {
      stdio: "pipe",
    }),
  );
});
test("records survive a server restart and logout revokes the session", async () => {
  server.kill();
  await new Promise((r) => server.once("exit", r));
  launch();
  await ready();
  const overview = await (
    await request("/api/admin/overview", { auth: true })
  ).json();
  assert.equal(overview.messages, 1);
  assert.equal(overview.views, 1);
  assert.equal(
    (await request("/api/admin/logout", { method: "POST", auth: true })).status,
    200,
  );
  assert.equal(
    (await request("/api/admin/messages", { auth: true })).status,
    401,
  );
});
test("failed login attempts are restricted persistently", async () => {
  const address = "unknown@example.invalid";
  let last;
  for (let i = 0; i < 7; i++)
    last = await request("/api/admin/login", {
      method: "POST",
      body: { email: address, password: "incorrect" },
    });
  assert.equal(last.status, 429);
});
