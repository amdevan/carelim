import type { Metadata } from "next";
import "./globals.css";

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
