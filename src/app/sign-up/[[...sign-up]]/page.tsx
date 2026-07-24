import { SignUp } from "@clerk/nextjs";
import { LocalAuthCard } from "@/components/local-auth-card";
import { isClerkConfigured } from "@/lib/server/env";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? <SignUp fallbackRedirectUrl="/onboarding" /> : <LocalAuthCard mode="sign-up" />}
    </main>
  );
}
