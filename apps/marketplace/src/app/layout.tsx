import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Carelim Marketplace",
  description: "Healthcare module marketplace - browse and install add-ons",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
