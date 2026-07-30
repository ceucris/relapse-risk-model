import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse · Personal Productivity Dashboard",
  description:
    "A personal productivity dashboard for tasks, habits, notes, and goals — Next.js 14, Neon Postgres, Vercel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
