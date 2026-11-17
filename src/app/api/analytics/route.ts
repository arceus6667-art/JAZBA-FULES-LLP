import { jsonBody } from "@/lib/security";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  clientKey,
  errorResponse,
  HttpError,
  limit,
  sameOrigin,
} from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1")
      return new Response(null, { status: 204 });
    await limit(`analytics:${clientKey(req)}`, 500, 10);
    const data = await jsonBody(req);
    if (
      typeof data.path !== "string" ||
      !/^\/(?:[a-z0-9/_-]*)$/i.test(data.path) ||
      data.path.startsWith("/admin") ||
      data.path.startsWith("/api")
    )
      throw new HttpError(400, "Invalid page.");
    const jar = await cookies();
    const consent = jar.get("jazba_analytics_consent")?.value;
    if (consent !== "yes") return new Response(null, { status: 204 });
    let id = jar.get("jazba_visitor")?.value;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) id = randomUUID();
    const ua = req.headers.get("user-agent") || "";
    if (/bot|crawler|spider|headless/i.test(ua))
      return new Response(null, { status: 204 });
    const existing = await db.visitorSession.findUnique({ where: { id } });
    const now = new Date();
    if (data.heartbeat) {
      if (existing)
        await db.visitorSession.update({
          where: { id },
          data: { lastSeenAt: now },
        });
      return new Response(null, { status: 204 });
    }
    let referralSource = "Direct";
    try {
      if (data.referrer)
        referralSource = new URL(data.referrer).hostname.slice(0, 150);
    } catch {}
    await db.$transaction(async (tx) => {
      await tx.visitorSession.upsert({
        where: { id },
        create: {
          id,
          deviceType: /iPad|Tablet/i.test(ua)
            ? "Tablet"
            : /Mobile|Android/i.test(ua)
              ? "Mobile"
              : "Desktop",
          browserType: /Edg\//.test(ua)
            ? "Edge"
            : /Firefox/.test(ua)
              ? "Firefox"
              : /Chrome/.test(ua)
                ? "Chrome"
                : /Safari/.test(ua)
                  ? "Safari"
                  : "Other",
          operatingSystem: /Windows/.test(ua)
            ? "Windows"
            : /Android/.test(ua)
              ? "Android"
              : /iPhone|iPad/.test(ua)
                ? "iOS"
                : /Mac/.test(ua)
                  ? "macOS"
                  : /Linux/.test(ua)
                    ? "Linux"
                    : "Other",
          referralSource,
        },
        update: {
          lastSeenAt: now,
          visits:
            existing &&
            now.getTime() - existing.lastSeenAt.getTime() > 30 * 60000
              ? { increment: 1 }
              : undefined,
        },
      });
      await tx.pageView.create({
        data: { visitorSessionId: id!, pagePath: data.path },
      });
    });
    jar.set("jazba_visitor", id, {
      httpOnly: true,
      secure: process.env.SITE_URL?.startsWith("https://") === true,
      sameSite: "lax",
      path: "/",
      maxAge: 90 * 86400,
    });
    return new Response(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
