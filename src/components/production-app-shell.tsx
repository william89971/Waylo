"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, Home, LogOut } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { WayloWordmark } from "@/components/waylo-wordmark";

const nav = [
  { href: "/app", label: "What to take", icon: Home },
  { href: "/app/courses", label: "Your classes", icon: BookOpen },
  { href: "/app/plan", label: "All terms", icon: CalendarDays },
];

function LocalSignOut() {
  return (
    <button
      type="button"
      className="local-sign-out"
      onClick={async () => {
        await fetch("/api/test-auth", { method: "DELETE" });
        window.location.assign("/sign-in");
      }}
    >
      <LogOut size={17} aria-hidden="true" /> Sign out
    </button>
  );
}

export function ProductionAppShell({
  children,
  clerkConfigured,
}: {
  children: React.ReactNode;
  clerkConfigured: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="production-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="production-mobile-header">
        <WayloWordmark href="/app" />
        {clerkConfigured ? <UserButton /> : <LocalSignOut />}
      </header>
      <aside className="production-sidebar">
        <WayloWordmark href="/app" />
        <nav aria-label="Student navigation">
          {nav.map(({ href, label }) => {
            const active = pathname === href || (href !== "/app" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={active ? "active" : ""}
                aria-current={pathname === href ? "page" : undefined}
              >
                <span className="nav-waypoint" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="production-account">{clerkConfigured ? <UserButton /> : <LocalSignOut />}</div>
      </aside>
      <main id="main-content" className="production-main">
        {children}
      </main>
      <nav className="production-mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ href, icon: Icon }) => {
          const shortLabel = href === "/app" ? "Home" : href === "/app/plan" ? "Terms" : "Classes";
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
