import { jsonBody } from "@/lib/security";
import { db } from "@/lib/db";
import {
  clientKey,
  errorResponse,
  HttpError,
  limit,
  sameOrigin,
} from "@/lib/security";
import { messageSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (Number(req.headers.get("content-length") || 0) > 16000)
      throw new HttpError(413, "Message is too large.");
    await limit(`contact:${clientKey(req)}`, 10, 60);
    const parsed = messageSchema.safeParse(await jsonBody(req));
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Please check your details and consent. Message must have at least 10 characters.",
        },
        { status: 400 },
      );
    const { website, ...data } = parsed.data;
    void website;
    const record = await db.corporateMessage.create({ data });
    return Response.json(
      {
        id: record.id,
        message:
          "Thank you for contacting Jazba Fuels LLP. We will reach you very shortly.",
      },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
