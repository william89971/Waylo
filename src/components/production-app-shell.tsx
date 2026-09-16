"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, FileCheck2, GraduationCap, Home, LogOut, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const nav = [
  { href: "/app", label: "Dashboard", icon: Home },
  { href: "/app/courses", label: "Courses", icon: BookOpen },
  { href: "/app/plan", label: "Transfer plan", icon: CalendarDays },
  { href: "/app/requirements", label: "Requirements", icon: GraduationCap },
  { href: "/app/evidence", label: "Evidence", icon: FileCheck2 },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

function LocalSignOut() {
  return <button type="button" className="local-sign-out" onClick={async () => { await fetch("/api/test-auth", { method: "DELETE" }); window.location.assign("/sign-in"); }}><LogOut size={17} aria-hidden="true" /> Sign out</button>;
}

export function ProductionAppShell({ children, clerkConfigured }: { children: React.ReactNode; clerkConfigured: boolean }) {
  const pathname = usePathname();
  return (
    <div className="production-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="production-mobile-header"><Link href="/app" className="production-brand">Waylo</Link>{clerkConfigured ? <UserButton /> : <LocalSignOut />}</header>
      <aside className="production-sidebar">
        <Link href="/app" className="production-brand">Waylo</Link>
        <nav aria-label="Student navigation">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || (href !== "/app" && pathname.startsWith(href)) ? "active" : ""}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="production-account">{clerkConfigured ? <UserButton /> : <LocalSignOut />}</div>
      </aside>
      <main id="main-content" className="production-main">{children}</main>
      <nav className="production-mobile-nav" aria-label="Mobile navigation">
        {nav.filter((item) => item.href !== "/app/requirements" && item.href !== "/app/settings").slice(0, 4).map(({ href, label, icon: Icon }) => {
          const shortLabel = label === "Dashboard" ? "Home" : label === "Transfer plan" ? "Plan" : label;
          return (
            <Link key={href} href={href} className={pathname === href ? "active" : ""} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
