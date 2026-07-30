import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse · Personal Life Dashboard",
  description:
    "A personal life dashboard for weeks, habits, quarters, years, and bucket lists — Next.js 14, Neon, Vercel.",
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
