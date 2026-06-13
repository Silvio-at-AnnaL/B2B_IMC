import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";
import LoginForm from "./login-form";

/** Login-Seite. Texte laufen ueber die Labelverwaltung (kein hartkodierter UI-Text). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const m = await loadLabels(await getRequestLang());
  const dict: Record<string, string> = {
    "login.title": t(m, "login.title"),
    "login.email": t(m, "login.email"),
    "login.password": t(m, "login.password"),
    "login.submit": t(m, "login.submit"),
    "login.error.invalid": t(m, "login.error.invalid"),
    "login.changed.success": t(m, "login.changed.success"),
    "common.loading": t(m, "common.loading"),
  };
  const sp = await searchParams;
  return <LoginForm dict={dict} changed={sp?.changed === "1"} />;
}
