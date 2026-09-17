import { SignIn } from "@clerk/nextjs";
import { LocalAuthCard } from "@/components/local-auth-card";
import { WayloWordmark } from "@/components/waylo-wordmark";
import { isClerkConfigured } from "@/lib/server/env";

export default function SignInPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? (
        <section className="auth-card">
          <WayloWordmark href="/" />
          <SignIn fallbackRedirectUrl="/app" />
        </section>
      ) : (
        <LocalAuthCard mode="sign-in" />
      )}
    </main>
  );
}
