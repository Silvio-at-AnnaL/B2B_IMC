import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ANNA-lyst — B2B Industrial Matchmaking",
  description: "Active, AI-driven partner identification for industrial sellers and buyers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
