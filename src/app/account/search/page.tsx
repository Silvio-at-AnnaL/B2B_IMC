import { loadLabels, t } from "@/lib/i18n/labels";
import { getRequestLang } from "@/lib/i18n/lang";
import SearchForm from "./search-form";

/** Suchformular (Seller/Buyer, Firmenname, URL, Produkt, Zielregion) — Texte als Labels. */
export default async function SearchPage() {
  const m = await loadLabels(await getRequestLang());
  const keys = [
    "search.title",
    "search.intro",
    "search.field.mode",
    "search.mode.seller",
    "search.mode.buyer",
    "search.field.company",
    "search.field.url.optional",
    "search.field.product",
    "search.field.region",
    "search.submit",
    "search.error.session",
    "search.error.mode",
    "search.error.required",
    "common.loading",
  ];
  const dict: Record<string, string> = {};
  for (const k of keys) dict[k] = t(m, k);

  return <SearchForm dict={dict} />;
}
