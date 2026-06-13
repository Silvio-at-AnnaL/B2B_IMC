"use client";
import { useActionState } from "react";
import { createSearchAction, type SearchState } from "./actions";

type Dict = Record<string, string>;

export default function SearchForm({ dict }: { dict: Dict }) {
  const [state, action, isPending] = useActionState<SearchState, FormData>(
    createSearchAction,
    {},
  );

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold">{dict["search.title"]}</h1>
      <p className="mb-6 text-neutral-600">{dict["search.intro"]}</p>

      <form action={action} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{dict["search.field.mode"]}</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" value="seller" defaultChecked className="mt-1" />
            <span>{dict["search.mode.seller"]}</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="mode" value="buyer" className="mt-1" />
            <span>{dict["search.mode.buyer"]}</span>
          </label>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          {dict["search.field.company"]}
          <input
            name="companyName"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["search.field.url.optional"]}
          <input
            name="companyUrl"
            type="url"
            placeholder="https://"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["search.field.product"]}
          <input
            name="product"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["search.field.region"]}
          <input
            name="targetRegion"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        {state.error && (
          <p className="rounded border border-brand-red/40 bg-brand-red/10 px-3 py-2 text-sm text-brand-red">
            {dict[state.error] ?? state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="self-start rounded bg-brand-blue px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? dict["common.loading"] : dict["search.submit"]}
        </button>
      </form>
    </div>
  );
}
