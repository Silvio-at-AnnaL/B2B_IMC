/**
 * LLM-Zugriff ueber den aktiven Eintrag in `llm_providers`.
 *
 * Architekturprinzip: Keys liegen verschluesselt in der DB (AES-256-GCM,
 * crypto.ts), nie im Quellcode oder in ENV. Der API-Key wird erst zur Laufzeit
 * entschluesselt. Das Modell und unkritische Parameter (temperature, max_tokens)
 * kommen ebenfalls aus der DB und sind im Admin pflegbar.
 */
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { llmProviders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";

export type LlmProvider = {
  vendor: string;
  model: string;
  apiKey: string;
  baseUrl: string | null;
  config: Record<string, unknown>;
};

/** Aktiven LLM-Provider laden (bevorzugt den als Default markierten) und Key entschluesseln. */
export async function getActiveLlmProvider(): Promise<LlmProvider> {
  const rows = await db.select().from(llmProviders).where(eq(llmProviders.active, true));
  if (rows.length === 0) throw new Error("Kein aktiver LLM-Provider konfiguriert.");
  const row = rows.find((r) => r.isDefault) ?? rows[0];
  if (!row.apiKeyEncrypted) throw new Error("Der aktive LLM-Provider hat keinen hinterlegten API-Key.");
  return {
    vendor: row.vendor,
    model: row.model,
    apiKey: decryptSecret(row.apiKeyEncrypted),
    baseUrl: row.baseUrl,
    config: (row.config as Record<string, unknown>) ?? {},
  };
}

export type ChatParams = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
};

/** Einen einzelnen Chat-Aufruf gegen den Provider ausfuehren und den Textinhalt zurueckgeben. */
export async function chat(provider: LlmProvider, p: ChatParams): Promise<string> {
  if (provider.vendor !== "anthropic") {
    throw new Error(`LLM-Vendor '${provider.vendor}' wird noch nicht unterstuetzt.`);
  }
  const client = new Anthropic({
    apiKey: provider.apiKey,
    ...(provider.baseUrl ? { baseURL: provider.baseUrl } : {}),
  });
  const cfg = provider.config;
  const resp = await client.messages.create({
    model: provider.model,
    max_tokens: p.maxTokens ?? (typeof cfg.max_tokens === "number" ? cfg.max_tokens : 2048),
    temperature: p.temperature ?? (typeof cfg.temperature === "number" ? cfg.temperature : 0.2),
    system: p.system,
    messages: [{ role: "user", content: p.user }],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
