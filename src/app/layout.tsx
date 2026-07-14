import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Waylo — Find your way through college",
    template: "%s | Waylo",
  },
  description: "Evidence-grounded academic navigation for community-college transfer students.",
  applicationName: "Waylo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
