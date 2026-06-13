/**
 * AES-256-GCM-Verschluesselung fuer in der DB gespeicherte Credentials
 * (LLM-Keys, SMTP-Passwoerter, API-Keys der Integrationen).
 * Schluessel: APP_ENCRYPTION_KEY (64 Hex-Zeichen = 32 Byte), NICHT in der DB.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function key(): Buffer {
  const hex = process.env.APP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("APP_ENCRYPTION_KEY fehlt oder hat falsche Laenge (erwartet: 64 Hex-Zeichen).");
  }
  return Buffer.from(hex, "hex");
}

/** Ergebnisformat: base64(iv).base64(tag).base64(ciphertext) */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Ungueltiges Secret-Format.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
