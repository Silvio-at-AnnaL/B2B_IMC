/** Zugriffsschutz: /admin nur fuer admin/staff, /account & /change-password nur eingeloggt.
 *  Zusaetzlich: erzwungener Passwortwechsel (users.must_change_pw) leitet auf /change-password. */
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const user = req.auth?.user as any;
  const role = user?.role;
  const mustChangePw = user?.mustChangePw === true;
  const { pathname } = req.nextUrl;

  // Nicht eingeloggt -> Login.
  if (pathname.startsWith("/admin")) {
    if (!req.auth) return NextResponse.redirect(new URL("/login", req.url));
    if (role !== "admin" && role !== "staff")
      return NextResponse.redirect(new URL("/", req.url));
  }
  if (
    (pathname.startsWith("/account") || pathname.startsWith("/change-password")) &&
    !req.auth
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Erzwungener Passwortwechsel: alle geschuetzten Routen umleiten, ausser der Wechsel-Seite selbst.
  if (req.auth && mustChangePw && !pathname.startsWith("/change-password")) {
    return NextResponse.redirect(new URL("/change-password", req.url));
  }

  return NextResponse.next();
});

export const config = { matcher: ["/admin/:path*", "/account/:path*", "/change-password"] };
