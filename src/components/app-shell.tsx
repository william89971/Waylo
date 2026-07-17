"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, CalendarDays, CircleHelp, Home, Library, Menu, Route, Scale, SlidersHorizontal, Sparkles, UserRound, X, FileText, Waypoints } from "lucide-react";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { JudgeMode } from "@/components/judge-mode";

const navItems = [
  { href: "/judge-tour", label: "Judge Tour", icon: Sparkles },
  { href: "/overview", label: "Overview", icon: Home },
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/pathways", label: "Pathways", icon: Waypoints },
  { href: "/roadmap", label: "Roadmap", icon: Route },
  { href: "/compare", label: "Compare", icon: Scale },
  { href: "/what-if", label: "What-If", icon: SlidersHorizontal },
  { href: "/planning-session", label: "Planning Session", icon: CalendarDays },
  { href: "/evidence", label: "Evidence", icon: Library },
  { href: "/advisor-summary", label: "Advisor Summary", icon: FileText },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="nav-list" aria-label="Waylo navigation">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className={`nav-link ${pathname === href ? "active" : ""}`} onClick={onNavigate}>
          <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useWorkspaceStore((state) => state.workspace.profile);
  const mode = useWorkspaceStore((state) => state.workspace.mode);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar">
        <Link href="/overview" className="brand" aria-label="Waylo overview">
          <span className="brand-word">Waylo</span>
          <span className="brand-tagline">Find your way through college.</span>
        </Link>
        <Navigation />
        <div className="sidebar-help">
          <CircleHelp size={18} aria-hidden="true" />
          <span><strong>Need help?</strong>Review this plan with your counselor.</span>
        </div>
      </aside>
      <div className="mobile-header">
        <Link href="/overview" className="brand" aria-label="Waylo overview"><span className="brand-word">Waylo</span></Link>
        <button className="icon-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      <div className="mobile-menu" hidden={!menuOpen}><Navigation onNavigate={() => setMenuOpen(false)} /></div>
      <main className="app-main">
        <div className="app-topbar">
          <span className="mode-label"><span className="mode-dot" />{mode === "seeded" ? "Seeded example" : "Live session"}</span>
          <JudgeMode />
          <Bell size={19} color="#52647a" aria-label="No new notifications" />
          <div className="user-summary">
            <span className="avatar"><UserRound size={18} /></span>
            <span><span className="user-name">{profile.name}</span><span className="user-role">Student</span></span>
          </div>
        </div>
        <div id="main-content">{children}</div>
      </main>
    </div>
  );
}
