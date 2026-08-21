import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carelim Admin",
  description: "Admin panel for Carelim healthcare platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
