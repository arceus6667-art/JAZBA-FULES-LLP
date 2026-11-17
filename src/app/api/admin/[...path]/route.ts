import { jsonBody } from "@/lib/security";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  admin,
  audit,
  errorResponse,
  HttpError,
  sameOrigin,
  sha256,
} from "@/lib/security";
import { announcementSchema, releaseSchema } from "@/lib/validation";
import { insights } from "@/lib/analytics";
import { settingKeys } from "@/lib/content";
import { makeBackup } from "@/lib/files";

type Context = { params: Promise<{ path: string[] }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const csv = (rows: unknown[][]) =>
  "\uFEFF" +
  rows
    .map((r) =>
      r
        .map(
          (v) =>
            '"' +
            String(v ?? "")
              .replace(/^[=+@\-\t\r]/, "'" + "$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
const download = (body: string, name: string) =>
  new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
function range(url: URL) {
  const rawFrom = url.searchParams.get("from"),
    rawTo = url.searchParams.get("to");
  const from = rawFrom
    ? new Date(`${rawFrom}T00:00:00+05:30`)
    : new Date(Date.now() - 29 * 86400000);
  const to = rawTo ? new Date(`${rawTo}T23:59:59.999+05:30`) : new Date();
  if (
    !Number.isFinite(+from) ||
    !Number.isFinite(+to) ||
    from > to ||
    +to - +from > 366 * 86400000
  )
    throw new HttpError(400, "Choose a date range up to one year.");
  return { from, to };
}
export async function GET(req: Request, ctx: Context) {
  try {
    const user = await admin();
    const [resource] = (await ctx.params).path;
    const url = new URL(req.url);
    if (resource === "session") return Response.json({ email: user.email });
    if (resource === "overview") {
      const today = new Date(
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
          new Date(),
        ) + "T00:00:00+05:30",
      );
      const [
        views,
        visitors,
        messages,
        unread,
        announcements,
        recent,
        logs,
        release,
        todayVisitors,
        weekVisitors,
        monthVisitors,
      ] = await Promise.all([
        db.pageView.count(),
        db.visitorSession.count(),
        db.corporateMessage.count(),
        db.corporateMessage.count({ where: { status: "New" } }),
        db.announcement.count({ where: { status: "Published" } }),
        db.corporateMessage.findMany({
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        db.auditLog.findMany({ orderBy: { timestamp: "desc" }, take: 8 }),
        db.applicationRelease.findFirst({
          where: { publicationStatus: "Published" },
          orderBy: { publishedAt: "desc" },
        }),
        db.visitorSession.count({
          where: { pageViews: { some: { timestamp: { gte: today } } } },
        }),
        db.visitorSession.count({
          where: {
            pageViews: {
              some: { timestamp: { gte: new Date(+today - 6 * 86400000) } },
            },
          },
        }),
        db.visitorSession.count({
          where: {
            pageViews: {
              some: {
                timestamp: {
                  gte: new Date(
                    new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Kolkata",
                    })
                      .format(new Date())
                      .slice(0, 7) + "-01T00:00:00+05:30",
                  ),
                },
              },
            },
          },
        }),
      ]);
      return Response.json({
        views,
        visitors,
        messages,
        unread,
        announcements,
        recent,
        logs,
        release,
        todayVisitors,
        weekVisitors,
        monthVisitors,
      });
    }
    if (resource === "analytics" || resource === "analytics-export") {
      const { from, to } = range(url),
        data = await insights(from, to);
      if (resource === "analytics-export")
        return download(
          csv([
            ["Date (Asia/Kolkata)", "Page views", "Inquiries"],
            ...data.traffic.map((v) => [v.date, v.views, v.inquiries]),
          ]),
          "jazba-analytics.csv",
        );
      return Response.json(data);
    }
    if (resource === "messages" || resource === "messages-export") {
      const q = (url.searchParams.get("q") || "").slice(0, 150),
        status = url.searchParams.get("status");
      const where = {
        ...(q
          ? {
              OR: [
                { fullName: { contains: q } },
                { email: { contains: q } },
                { companyName: { contains: q } },
              ],
            }
          : {}),
        ...(status ? { status } : {}),
        ...(url.searchParams.has("from") || url.searchParams.has("to")
          ? { createdAt: { gte: range(url).from, lte: range(url).to } }
          : {}),
      };
      if (resource === "messages-export") {
        const ids = url.searchParams.getAll("id").slice(0, 500);
        const rows = await db.corporateMessage.findMany({
          where: { ...where, ...(ids.length ? { id: { in: ids } } : {}) },
          orderBy: { createdAt: "desc" },
          take: 10000,
        });
        await audit(
          user.id,
          "Exported messages",
          "CorporateMessage",
          String(rows.length),
        );
        return download(
          csv([
            [
              "ID",
              "Name",
              "Email",
              "Company",
              "Phone",
              "Subject",
              "Message",
              "Status",
              "Private notes",
              "Consent",
              "Created at",
            ],
            ...rows.map((r) => [
              r.id,
              r.fullName,
              r.email,
              r.companyName,
              r.contactNumber,
              r.subject,
              r.message,
              r.status,
              r.administrativeNotes,
              r.consent,
              r.createdAt.toISOString(),
            ]),
          ]),
          "jazba-messages.csv",
        );
      }
      const page = Math.max(
        1,
        Math.min(10000, Number(url.searchParams.get("page")) || 1),
      );
      const [rows, total] = await Promise.all([
        db.corporateMessage.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 15,
          take: 15,
        }),
        db.corporateMessage.count({ where }),
      ]);
      return Response.json({ rows, total, page });
    }
    if (resource === "announcements")
      return Response.json(
        await db.announcement.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      );
    if (resource === "releases")
      return Response.json(
        await db.applicationRelease.findMany({
          include: { file: true },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      );
    if (resource === "files")
      return Response.json(
        await db.storedFile.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      );
    if (resource === "settings")
      return Response.json(
        Object.fromEntries(
          (await db.websiteSetting.findMany()).map((s) => [s.key, s.value]),
        ),
      );
    if (resource === "logs")
      return Response.json(
        await db.auditLog.findMany({
          include: { administrator: { select: { email: true } } },
          orderBy: { timestamp: "desc" },
          take: 200,
        }),
      );
    if (resource === "backup") {
      const buffer = await makeBackup();
      await audit(
        user.id,
        "Downloaded verified backup",
        "Backup",
        "database-and-files",
      );
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/gzip",
          "Content-Disposition": `attachment; filename="jazba-backup-${new Date().toISOString().slice(0, 10)}.tar.gz"`,
          "Cache-Control": "no-store",
        },
      });
    }
    throw new HttpError(404, "Not found.");
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(req: Request, ctx: Context) {
  return mutate(req, ctx);
}
export async function PATCH(req: Request, ctx: Context) {
  return mutate(req, ctx);
}
export async function DELETE(req: Request, ctx: Context) {
  return mutate(req, ctx);
}
async function mutate(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const user = await admin();
    const [resource, id] = (await ctx.params).path;
    if (resource === "logout") {
      const jar = await cookies(),
        token = jar.get("jazba_admin")?.value;
      if (token)
        await db.adminSession.deleteMany({ where: { id: sha256(token) } });
      jar.delete("jazba_admin");
      await audit(user.id, "Signed out", "AdminUser", user.id);
      return Response.json({ ok: true });
    }
    if (req.method === "DELETE") {
      if (!id) throw new HttpError(400, "Record required.");
      if (resource === "messages")
        await db.corporateMessage.delete({ where: { id } });
      else if (resource === "announcements")
        await db.announcement.delete({ where: { id } });
      else if (resource === "releases")
        await db.applicationRelease.delete({ where: { id } });
      else throw new HttpError(400, "This record cannot be deleted here.");
      await audit(user.id, "Deleted record", resource, id);
      return Response.json({ ok: true });
    }
    const body = await jsonBody(req);
    if (resource === "messages" && id) {
      const parsed = z
        .object({
          status: z.enum(["New", "Read", "Responded", "Resolved", "Archived"]),
          administrativeNotes: z.string().max(10000),
        })
        .safeParse(body);
      if (!parsed.success) throw new HttpError(400, "Invalid message update.");
      await db.corporateMessage.update({ where: { id }, data: parsed.data });
    } else if (resource === "announcements") {
      const parsed = announcementSchema.safeParse(body);
      if (!parsed.success)
        throw new HttpError(400, "Check the announcement fields.");
      await validateImages([parsed.data.imagePath]);
      const data = {
        ...parsed.data,
        publishedAt: parsed.data.status === "Published" ? new Date() : null,
      };
      if (id) await db.announcement.update({ where: { id }, data });
      else await db.announcement.create({ data });
    } else if (resource === "releases") {
      const parsed = releaseSchema.safeParse(body);
      if (!parsed.success)
        throw new HttpError(400, "Check the release fields.");
      const value = parsed.data;
      await validateImages([value.iconPath, ...value.screenshotPaths]);
      const file = value.fileId
        ? await db.storedFile.findUnique({ where: { id: value.fileId } })
        : null;
      if (
        value.fileId &&
        (!file ||
          file.mime !== "application/vnd.android.package-archive" ||
          !file.verified)
      )
        throw new HttpError(400, "Select a verified official APK.");
      if (
        value.releaseStatus === "Released" &&
        value.publicationStatus === "Published" &&
        !file?.verified
      )
        throw new HttpError(
          400,
          "A released app requires a scanned APK with a verified official signature.",
        );
      const releaseDate = value.releaseDate
        ? new Date(value.releaseDate)
        : null;
      if (releaseDate && !Number.isFinite(+releaseDate))
        throw new HttpError(400, "Invalid release date.");
      const data = {
        ...value,
        fileId: value.fileId || null,
        screenshotPaths: JSON.stringify(value.screenshotPaths),
        releaseDate,
        publishedAt:
          value.publicationStatus === "Published" ? new Date() : null,
      };
      if (id) await db.applicationRelease.update({ where: { id }, data });
      else await db.applicationRelease.create({ data });
    } else if (resource === "settings") {
      const parsed = z.record(z.string(), z.string().max(3000)).safeParse(body);
      if (!parsed.success) throw new HttpError(400, "Invalid settings.");
      const data = parsed.data;
      if (data.contactEmail && !z.email().safeParse(data.contactEmail).success)
        throw new HttpError(400, "Invalid contact email.");
      if (data.contactPhone && !/^[+\d\s()\-]{7,25}$/.test(data.contactPhone))
        throw new HttpError(400, "Invalid contact phone.");
      await db.$transaction(
        settingKeys
          .filter((key) => key in data)
          .map((key) =>
            db.websiteSetting.upsert({
              where: { key },
              create: { key, value: data[key] },
              update: { value: data[key] },
            }),
          ),
      );
    } else throw new HttpError(404, "Not found.");
    await audit(
      user.id,
      id ? "Updated record" : "Created or updated record",
      resource,
      id || "new",
    );
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
async function validateImages(paths: string[]) {
  for (const path of paths.filter(Boolean)) {
    const match = /^\/api\/media\/([a-z0-9]+)$/.exec(path);
    if (!match) throw new HttpError(400, "Use an uploaded image.");
    const file = await db.storedFile.findUnique({ where: { id: match[1] } });
    if (!file || !file.mime.startsWith("image/") || !file.verified)
      throw new HttpError(400, "Image is not available.");
  }
}
