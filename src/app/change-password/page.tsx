import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";
import ChangePasswordForm from "./change-password-form";

/** Passwortwechsel-Seite (Zugriff nur eingeloggt, erzwungen bei must_change_pw via Middleware). */
export default async function ChangePasswordPage() {
  const m = await loadLabels(await getRequestLang());
  const keys = [
    "changepw.title",
    "changepw.hint",
    "changepw.current",
    "changepw.new",
    "changepw.confirm",
    "changepw.submit",
    "changepw.error.session",
    "changepw.error.tooShort",
    "changepw.error.mismatch",
    "changepw.error.wrongCurrent",
    "changepw.error.same",
    "common.loading",
  ];
  const dict: Record<string, string> = {};
  for (const k of keys) dict[k] = t(m, k);

  return <ChangePasswordForm dict={dict} />;
}
