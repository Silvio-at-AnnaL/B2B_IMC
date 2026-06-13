export const dynamic = "force-dynamic"; // Inhalt wird im Admin gepflegt, nie zur Buildzeit einfrieren
/** robots.txt wird im Admin-Bereich gepflegt (settings.key = "robots_txt"). */
import { getSetting } from "@/lib/settings";

export async function GET() {
  const content =
    (await getSetting<string>("robots_txt")) ??
    "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/";
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
