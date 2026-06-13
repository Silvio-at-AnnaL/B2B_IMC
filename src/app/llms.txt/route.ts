export const dynamic = "force-dynamic"; // Inhalt wird im Admin gepflegt, nie zur Buildzeit einfrieren
/** llms.txt wird im Admin-Bereich gepflegt (settings.key = "llms_txt"). */
import { getSetting } from "@/lib/settings";

export async function GET() {
  const content =
    (await getSetting<string>("llms_txt")) ??
    "# ANNA-lyst\n\nAI-powered B2B industrial matchmaking platform.";
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
