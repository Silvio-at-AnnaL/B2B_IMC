import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const u = rows[0];
        if (!u || u.status !== "active" || !u.passwordHash) return null;
        const ok = await bcrypt.compare(password, u.passwordHash);
        if (!ok) return null;
        const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined;
        return { id: String(u.id), email: u.email, name, role: u.role } as any;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      (session.user as any).role = token.role;
      (session.user as any).id = token.sub;
      return session;
    },
  },
  pages: { signIn: "/login" },
});
