import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/server/env";
import "./globals.css";
import "./production.css";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

const clerkAppearance = {
  variables: {
    colorPrimary: "#111111",
    colorBackground: "#ffffff",
    colorText: "#111111",
    colorTextSecondary: "#6b6b6b",
    colorNeutral: "#111111",
    colorInputBackground: "#ffffff",
    colorInputText: "#111111",
    borderRadius: "24px",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    cardBox: {
      background: "transparent",
      boxShadow: "none",
      border: "0",
    },
    card: {
      background: "transparent",
      boxShadow: "none",
    },
    headerTitle: {
      fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      fontWeight: "700",
    },
    formButtonPrimary: {
      background: "#111111",
      borderRadius: "999px",
      fontWeight: "650",
    },
    footer: {
      background: "transparent",
    },
  },
};

export const metadata: Metadata = {
  title: {
    default: "Waylo — Know what to take next semester",
    template: "%s | Waylo",
  },
  description:
    "Waylo turns official ASSIST agreements into a next-semester College of the Canyons transfer plan. Bring it to a counselor before you enroll.",
  applicationName: "Waylo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = isClerkConfigured() ? (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  ) : (
    children
  );
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className}`}
      >
        {content}
      </body>
    </html>
  );
}
