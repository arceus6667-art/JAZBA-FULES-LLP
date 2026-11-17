import { admin, audit, errorResponse, sameOrigin } from "@/lib/security";
import { storeFile } from "@/lib/files";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const user = await admin();
    const file = await storeFile(req);
    await audit(user.id, "Uploaded verified file", "StoredFile", file.id);
    return Response.json(
      { ...file, url: `/api/media/${file.id}` },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
