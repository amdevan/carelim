import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { validateEnv } from "@/lib/env";

// Force dynamic rendering for all pages (prevents build-time DB access)
export const dynamic = "force-dynamic";

// Validate environment variables at startup
validateEnv();

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carelim OS — Enterprise Healthcare Management Platform",
  description:
    "Carelim OS — Complete clinic & hospital management SaaS platform. Patients, doctors, appointments, EMR, pharmacy, laboratory, radiology, billing, accounting, inventory & more.",
  keywords: [
    "Carelim OS",
    "Clinic Management",
    "Hospital Management",
    "EMR",
    "EHR",
    "Healthcare SaaS",
    "Pharmacy",
    "Laboratory",
    "Multi-Tenant",
  ],
  authors: [{ name: "Carelim OS" }],
  icons: {
    icon: "/images/carelim-os.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
