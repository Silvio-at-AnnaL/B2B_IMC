"use server";
/**
 * Passwortwechsel (auch erzwungen bei must_change_pw). Verifiziert das aktuelle
 * Passwort, setzt das neue (bcrypt-gehasht), loescht das must_change_pw-Flag und
 * meldet den Nutzer ab, damit er sich mit dem neuen Passwort frisch anmeldet.
 */
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const MIN_PW_LENGTH = 8;

export type ChangePwState = { error?: string };

export async function changePasswordAction(
  _prev: ChangePwState,
  formData: FormData,
): Promise<ChangePwState> {
  const session = await auth();
  const userId = Number((session?.user as any)?.id);
  if (!session || !Number.isFinite(userId)) return { error: "changepw.error.session" };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < MIN_PW_LENGTH) return { error: "changepw.error.tooShort" };
  if (next !== confirm) return { error: "changepw.error.mismatch" };

  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const u = rows[0];
  if (!u || !u.passwordHash) return { error: "changepw.error.session" };

  if (!(await bcrypt.compare(current, u.passwordHash)))
    return { error: "changepw.error.wrongCurrent" };
  if (await bcrypt.compare(next, u.passwordHash))
    return { error: "changepw.error.same" };

  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(next, 12), mustChangePw: false })
    .where(eq(users.id, userId));

  // Abmelden erzwingt eine frische Anmeldung; das JWT spiegelt danach must_change_pw=false.
  await signOut({ redirectTo: "/login?changed=1" });
  return {};
}
