import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({ src: "./fonts/Geist-Variable.woff2", variable: "--font-geist-sans", display: "swap", weight: "100 900" });
const geistMono = localFont({ src: "./fonts/GeistMono-Variable.woff2", variable: "--font-geist-mono", display: "swap", weight: "100 900" });

export const metadata: Metadata = {
  title: {
    default: "Waylo — See what changes before you change your plan",
    template: "%s | Waylo",
  },
  description: "An evidence-grounded academic decision simulator for community-college transfer students.",
  applicationName: "Waylo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
