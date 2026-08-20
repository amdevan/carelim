import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Carelim Marketplace",
  description: "Healthcare module marketplace for Carelim",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
