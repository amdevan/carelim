import type { Metadata } from "next";
import "./globals.css";

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carelim SaaS Admin",
  description: "SaaS administration panel for Carelim",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
