import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  admin,
  audit,
  errorResponse,
  HttpError,
  sameOrigin,
  sha256,
} from "@/lib/security";
import { storageDir } from "@/lib/files";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
export async function GET(_req: Request, ctx: Context) {
  try {
    const { id } = await ctx.params;
    const file = await db.storedFile.findUnique({ where: { id } });
    if (!file || !file.verified)
      throw new HttpError(404, "File not available.");
    const path = `/api/media/${id}`;
    const published = file.mime.startsWith("image/")
      ? (await db.announcement.count({
          where: { status: "Published", imagePath: path },
        })) > 0 ||
        (await db.applicationRelease.count({
          where: {
            publicationStatus: "Published",
            OR: [{ iconPath: path }, { screenshotPaths: { contains: path } }],
          },
        })) > 0
      : (await db.applicationRelease.count({
          where: {
            fileId: id,
            publicationStatus: "Published",
            releaseStatus: "Released",
          },
        })) > 0;
    if (!published) await admin();
    const bytes = await readFile(join(storageDir(), file.storedName));
    if (sha256(bytes) !== file.checksum)
      throw new HttpError(409, "File integrity check failed.");
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `${file.mime.startsWith("image/") ? "inline" : "attachment"}; filename="${file.storedName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(req: Request, ctx: Context) {
  try {
    sameOrigin(req);
    const user = await admin();
    const { id } = await ctx.params;
    const file = await db.storedFile.findUnique({
      where: { id },
      include: { releases: true },
    });
    if (!file) throw new HttpError(404, "File not found.");
    const path = `/api/media/${id}`;
    const references =
      (await db.applicationRelease.count({
        where: {
          OR: [{ iconPath: path }, { screenshotPaths: { contains: path } }],
        },
      })) + (await db.announcement.count({ where: { imagePath: path } }));
    if (file.releases.length || references)
      throw new HttpError(
        409,
        "Remove this file from its releases and announcements first.",
      );
    await rm(join(storageDir(), file.storedName), { force: true });
    await db.storedFile.delete({ where: { id } });
    await audit(user.id, "Deleted file", "StoredFile", id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
