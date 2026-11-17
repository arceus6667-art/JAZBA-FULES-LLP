import { jsonBody } from "@/lib/security";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  audit,
  clientKey,
  errorResponse,
  HttpError,
  limit,
  newSession,
  sameOrigin,
  verifyPassword,
} from "@/lib/security";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await limit(`login-ip:${clientKey(req)}`, 30, 15);
    const data = z
      .object({
        email: z.email().max(254),
        password: z.string().min(1).max(256),
      })
      .safeParse(await jsonBody(req));
    if (!data.success)
      throw new HttpError(400, "Enter a valid email and password.");
    const email = data.data.email.toLowerCase();
    await limit(`login-account:${email}`, 6, 15);
    const user = await db.adminUser.findUnique({ where: { email } });
    // Perform the same expensive hash when the email does not exist.
    const valid = verifyPassword(
      data.data.password,
      user?.passwordHash ||
        "00000000000000000000000000000000:" + "00".repeat(64),
    );
    if (!user || !valid)
      throw new HttpError(401, "Email or password is incorrect.");
    await newSession(user.id);
    await db.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await audit(user.id, "Signed in", "AdminUser", user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
