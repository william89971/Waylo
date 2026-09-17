import { SignUp } from "@clerk/nextjs";
import { LocalAuthCard } from "@/components/local-auth-card";
import { WayloWordmark } from "@/components/waylo-wordmark";
import { isClerkConfigured } from "@/lib/server/env";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? (
        <section className="auth-card">
          <WayloWordmark href="/" />
          <SignUp fallbackRedirectUrl="/onboarding" />
        </section>
      ) : (
        <LocalAuthCard mode="sign-up" />
      )}
    </main>
  );
}
