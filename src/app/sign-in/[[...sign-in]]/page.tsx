import { SignIn } from "@clerk/nextjs";
import { LocalAuthCard } from "@/components/local-auth-card";
import { isClerkConfigured } from "@/lib/server/env";

export default function SignInPage() {
  return (
    <main className="auth-page">
      {isClerkConfigured() ? <SignIn fallbackRedirectUrl="/app" /> : <LocalAuthCard mode="sign-in" />}
    </main>
  );
}
