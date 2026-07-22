import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/server/env";
import "./globals.css";
import "./production.css";

const geistSans = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist-sans", display: "swap", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/GeistMono-Variable.woff2", variable: "--font-geist-mono", display: "swap", weight: "100 900" });

export const metadata: Metadata = {
  title: {
    default: "Waylo — Your evidence-backed transfer plan",
    template: "%s | Waylo",
  },
  description: "Build an evidence-backed College of the Canyons transfer plan and see what to take next semester.",
  applicationName: "Waylo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = isClerkConfigured() ? <ClerkProvider>{children}</ClerkProvider> : children;
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{content}</body>
    </html>
  );
}
