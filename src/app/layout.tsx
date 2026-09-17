import type { Metadata } from "next";
import localFont from "next/font/local";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/server/env";
import "./globals.css";
import "./production.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

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
    colorPrimary: "#1b1712",
    colorBackground: "#f3eee4",
    colorText: "#1b1712",
    colorTextSecondary: "#6b6458",
    colorNeutral: "#1b1712",
    colorInputBackground: "#f8f4ec",
    colorInputText: "#1b1712",
    borderRadius: "2px",
    fontFamily: "var(--font-source-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-source-sans), ui-sans-serif, system-ui, sans-serif",
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
      fontFamily: "var(--font-newsreader), Georgia, serif",
      fontWeight: "500",
    },
    formButtonPrimary: {
      background: "#1b1712",
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
        className={`${sourceSans.variable} ${newsreader.variable} ${geistSans.variable} ${geistMono.variable} ${sourceSans.className}`}
      >
        {content}
      </body>
    </html>
  );
}
