/** Zugriffsschutz: /admin nur fuer admin/staff, /account nur eingeloggt. */
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const role = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin" && role !== "staff")
      return NextResponse.redirect(new URL("/", req.url));
  }
  if (pathname.startsWith("/account") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/account/:path*"] };
