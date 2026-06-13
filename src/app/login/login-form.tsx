"use client";
import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

type Dict = Record<string, string>;

export default function LoginForm({ dict, changed }: { dict: Dict; changed: boolean }) {
  const [state, action, isPending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">{dict["login.title"]}</h1>

      {changed && (
        <p className="rounded border border-brand-green/40 bg-brand-green/10 px-3 py-2 text-sm text-brand-green">
          {dict["login.changed.success"]}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {dict["login.email"]}
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {dict["login.password"]}
          <input
            name="password"
            type="password"
            autoComplete="current-password"
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
          {isPending ? dict["common.loading"] : dict["login.submit"]}
        </button>
      </form>
    </main>
  );
}
