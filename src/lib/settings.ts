/**
 * Key-Value-Settings mit transparenter Verschluesselung (GAIO-Empfehlung 5):
 * setSetting(..., { encrypted: true }) verschluesselt vor dem Speichern,
 * getSetting entschluesselt automatisch anhand des isEncrypted-Flags.
 */
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  if (row.isEncrypted) {
    return JSON.parse(decryptSecret(row.value as string)) as T;
  }
  return row.value as T;
}

export async function setSetting(
  key: string,
  value: unknown,
  opts: { encrypted?: boolean; userId?: number } = {},
) {
  const stored = opts.encrypted ? encryptSecret(JSON.stringify(value)) : value;
  await db
    .insert(settings)
    .values({ key, value: stored as any, isEncrypted: !!opts.encrypted, updatedByUserId: opts.userId })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: stored as any,
        isEncrypted: !!opts.encrypted,
        updatedAt: new Date(),
        updatedByUserId: opts.userId,
      },
    });
}
