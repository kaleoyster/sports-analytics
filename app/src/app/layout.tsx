import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026",
  description: "Track your family's World Cup 2026 picks",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased text-text">{children}</body>
    </html>
  );
}
