"use server";
/** Login-Server-Action. Gibt bei Fehler einen Label-Key zurueck (Text bleibt im UI). */
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "login.error.invalid" };

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (e) {
    if (e instanceof AuthError) return { error: "login.error.invalid" };
    throw e;
  }

  // Zielroute nach Rolle; erzwungener Passwortwechsel hat Vorrang (Middleware sichert zusaetzlich ab).
  const rows = await db
    .select({ role: users.role, mustChangePw: users.mustChangePw })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const u = rows[0];
  if (u?.mustChangePw) redirect("/change-password");
  redirect(u && (u.role === "admin" || u.role === "staff") ? "/admin" : "/account");
}
