import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="production-landing">
      <a href="#sign-up" className="skip-link">
        Skip to sign up
      </a>
      <nav className="production-landing-nav" aria-label="Main navigation">
        <Link href="/" className="production-brand">
          Waylo
        </Link>
        <div className="production-nav-actions">
          <Link href="/sign-in" className="production-text-link">
            Sign in
          </Link>
          <Link href="/sign-up" className="production-button primary">
            Sign up
          </Link>
        </div>
      </nav>
      <section className="production-hero">
        <div>
          <h1>Know what to take next semester.</h1>
          <p>
            Enter your College of the Canyons academic history, choose universities and majors, and get a
            semester-by-semester plan with sources you can take to a counselor.
          </p>
          <div id="sign-up" className="production-hero-actions">
            <Link href="/sign-up" className="production-button primary">
              Sign up
            </Link>
            <Link href="/sign-in" className="production-button">
              Sign in
            </Link>
          </div>
          <p className="production-disclaimer">
            Waylo is a planning aid, not an official degree audit. Confirm anything marked for review in ASSIST or with
            a counselor before you enroll.
          </p>
        </div>
      </section>
    </main>
  );
}
