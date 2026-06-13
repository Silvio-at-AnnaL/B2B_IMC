"use client";
import { useActionState } from "react";
import { changePasswordAction, type ChangePwState } from "./actions";

type Dict = Record<string, string>;

export default function ChangePasswordForm({ dict }: { dict: Dict }) {
  const [state, action, isPending] = useActionState<ChangePwState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">{dict["changepw.title"]}</h1>
      <p className="text-sm text-neutral-600">{dict["changepw.hint"]}</p>

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {dict["changepw.current"]}
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["changepw.new"]}
          <input
            name="next"
            type="password"
            autoComplete="new-password"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["changepw.confirm"]}
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
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
          className="rounded bg-brand-blue px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? dict["common.loading"] : dict["changepw.submit"]}
        </button>
      </form>
    </main>
  );
}
