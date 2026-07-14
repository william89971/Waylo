import { AlertTriangle, Check, Circle, X } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="page-header title-row">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function Status({ tone, label }: { tone: "confirmed" | "warning" | "blocker" | "planned"; label: string }) {
  const Icon = tone === "confirmed" ? Check : tone === "warning" ? AlertTriangle : tone === "blocker" ? X : Circle;
  return (
    <span className={`status ${tone}`}>
      <span className="status-icon"><Icon size={tone === "warning" ? 15 : 14} strokeWidth={2.2} /></span>
      <span>{label}</span>
    </span>
  );
}

export function Tag({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "purple" | "teal" | "amber" }) {
  return <span className={`tag ${tone === "default" ? "" : tone}`}>{children}</span>;
}
