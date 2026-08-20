import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Carelim MS",
  description: "Marketing & CRM system for Carelim",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
