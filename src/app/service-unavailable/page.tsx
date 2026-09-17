import Link from "next/link";
import { WayloWordmark } from "@/components/waylo-wordmark";

export default function ServiceUnavailablePage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <WayloWordmark href="/" />
        <h1>Account services are being prepared</h1>
        <p>
          This environment is not connected to Waylo’s secure authentication and student database. No academic
          information can be entered or stored here.
        </p>
        <Link href="/" className="production-button primary">Return to Waylo</Link>
      </section>
    </main>
  );
}
