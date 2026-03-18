import { cookies } from "next/headers";
import { verifySession } from "./crypto";

const COOKIE_NAME = "rb_session";

export async function getSessionShop(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySession(cookie);
}
