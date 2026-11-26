"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "../../lib/supabase/browser";

const TYPEWRITER_WORDS = ["Attrition", "Operations", "Workforce", "Insights"];

type LoginPageProps = {
  supabaseUrl: string;
  anonKey: string;
  initialError?: string;
};

export default function LoginPage({ supabaseUrl, anonKey, initialError = "" }: LoginPageProps) {
  const router = useRouter();
  const supabase = useMemo(
    () => supabaseUrl && anonKey ? createSupabaseBrowserClient(supabaseUrl, anonKey) : null,
    [anonKey, supabaseUrl],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [typewriterText, setTypewriterText] = useState("");
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [typewriterDeleting, setTypewriterDeleting] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReduceMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const currentWord = TYPEWRITER_WORDS[typewriterIndex % TYPEWRITER_WORDS.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!typewriterDeleting && typewriterText !== currentWord) {
      timeout = setTimeout(() => setTypewriterText(currentWord.slice(0, typewriterText.length + 1)), 85);
    } else if (!typewriterDeleting) {
      timeout = setTimeout(() => setTypewriterDeleting(true), 1600);
    } else if (typewriterText.length > 0) {
      timeout = setTimeout(() => setTypewriterText(currentWord.slice(0, typewriterText.length - 1)), 50);
    } else {
      timeout = setTimeout(() => {
        setTypewriterDeleting(false);
        setTypewriterIndex((index) => index + 1);
      }, 260);
    }

    return () => clearTimeout(timeout);
  }, [reduceMotion, typewriterDeleting, typewriterIndex, typewriterText]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setLockoutSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      fetch("/api/auth/access", { cache: "no-store" })
        .then((response) => {
          if (response.ok) window.location.replace("/dashboard");
          else setSubmitting(false);
        })
        .catch(() => setSubmitting(false));
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || lockoutSeconds > 0) return;
    if (!supabase) {
      setErrorMessage("Supabase login is not configured. Check the project URL and anon key.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const waitMatch = error.message.match(/(?:after|in) (\d+) seconds?/i);
        const seconds = waitMatch ? Number(waitMatch[1]) : 0;
        setLockoutSeconds(seconds);
        setErrorMessage(seconds > 0
          ? `Please wait ${seconds} seconds before trying again.`
          : "Sign in failed. Check your email and password, then try again.");
        setSubmitting(false);
        return;
      }

      const accessResponse = await fetch("/api/auth/access", { cache: "no-store" });
      if (!accessResponse.ok) {
        await supabase.auth.signOut();
        setErrorMessage("Your account does not have a dashboard role assigned. Contact your administrator.");
        setSubmitting(false);
        return;
      }

      const access = await accessResponse.json() as { destination: string };
      router.replace(access.destination);
      router.refresh();
    } catch {
      setErrorMessage("Unable to connect. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      setErrorMessage("Supabase login is not configured. Check the project URL and anon key.");
      return;
    }

    setOauthLoading(true);
    setErrorMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setOauthLoading(false);
      setErrorMessage("Google sign in is unavailable. Use your email and password or contact your administrator.");
    }
  }

  const disabled = submitting || oauthLoading || lockoutSeconds > 0;

  return (
    <main className="flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[var(--color-login-paper)] text-[var(--color-login-ink)] lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(380px,1fr)]">
      <section className="relative hidden min-h-[100dvh] overflow-hidden bg-[var(--color-login-night)] text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-y-0 right-0 flex w-[72%] items-center justify-center bg-no-repeat opacity-70"
          style={{
            backgroundImage: "url('/Hero-Photo-scaled.png')",
            backgroundPosition: "center",
            backgroundSize: "auto 100%",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-login-night)]/70 via-[var(--color-login-night)]/35 to-[var(--color-login-night)]/85" />
        <div className="absolute -right-80 -bottom-40 h-[520px] w-[520px] rounded-full border-[80px] border-[var(--color-accent)]/40" />
        <div className="absolute -right-64 -bottom-28 h-[380px] w-[380px] rounded-full border-[55px] border-[var(--color-gold)]/30" />
        <div className="relative z-10 flex flex-1 flex-col justify-center px-[clamp(2rem,5vw,4.5rem)] py-12">
          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.75rem,5vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              Operations
              <br />
              Workforce
              <br />
              <span className="inline-block min-h-[1.05em] text-[var(--color-gold)]">
                {reduceMotion ? TYPEWRITER_WORDS[0] : typewriterText}
                <span className="ml-1 animate-pulse">|</span>
              </span>
            </h1>
            <div className="my-8 h-px w-16 bg-[var(--color-gold)]" />
            <p className="max-w-lg text-[clamp(1rem,1.4vw,1.25rem)] leading-8 text-white/75">
              Track operational performance, monitor workforce changes, and understand attrition trends in one clear view.
            </p>
          </div>
        </div>
        <div className="relative z-10 px-[clamp(2rem,5vw,4.5rem)] pb-10">
          <div className="mb-9 grid max-w-3xl grid-cols-3 gap-8">
            {[
              ["Operate", "Clear account overview"],
              ["Track", "Workforce trends"],
              ["Understand", "Attrition patterns"],
            ].map(([title, caption]) => (
              <div key={title} className={`border-l pl-4 ${title === "Understand" ? "border-[var(--color-gold)]" : "border-white/25"}`}>
                <p className={`mb-1 text-[10px] ${title === "Understand" ? "text-[var(--color-gold)]" : "text-white/55"}`}>{title}</p>
                <p className="text-sm font-medium">{caption}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-white/15 pt-5 text-[10px] text-white/50">
            <span>Operation System</span>
            <span>CTNP | Philippines</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-[100dvh] w-full overflow-y-auto px-4 py-8 sm:px-8 sm:py-10 lg:px-[clamp(2rem,5vw,5rem)] lg:py-12">
        <div className="mx-auto flex min-h-full w-full max-w-[34rem] flex-col justify-center">
          <div className="mb-2 flex justify-center">
            <Image
              src="/ctnp-logo.png"
              alt="CTNP logo"
              width={1080}
              height={1080}
              priority
              className="h-24 w-44 rounded-xl bg-white object-contain p-1"
            />
          </div>
          <div className="mb-6 text-center lg:hidden">
            <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--color-login-ink)]">
              Operations &{" "}
              <span className="inline-block text-[var(--color-gold)]">
                {reduceMotion ? TYPEWRITER_WORDS[0] : typewriterText}
                <span className="ml-0.5 animate-pulse">|</span>
              </span>
            </p>
          </div>
          <div className="mb-7 text-center sm:mb-8">
            <h2 className="text-[clamp(2rem,4vw,2.35rem)] font-semibold tracking-[-0.035em] text-[var(--color-login-ink)]">Welcome back</h2>
            <p className="mt-3 text-base text-[var(--color-login-muted)]">Sign in to Operation System.</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-xs font-semibold text-[var(--color-login-label)]">Email</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-login-icon)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-3.4 2.9-5.5 7-5.5s6.4 2.1 7 5.5" />
                </svg>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  disabled={disabled}
                  placeholder="Enter your work email"
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-14 w-full rounded-xl border border-[var(--color-login-rule)] bg-white pl-12 pr-4 text-[15px] text-[var(--color-login-ink)] outline-none transition placeholder:text-[var(--color-login-placeholder)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-xs font-semibold text-[var(--color-login-label)]">Password</label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-login-icon)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
                  <rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" />
                </svg>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  disabled={disabled}
                  placeholder="Enter your password"
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-14 w-full rounded-xl border border-[var(--color-login-rule)] bg-white pl-12 pr-14 text-[15px] text-[var(--color-login-ink)] outline-none transition placeholder:text-[var(--color-login-placeholder)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={disabled}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-login-action)] hover:text-[var(--color-accent)] disabled:opacity-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <p className="text-xs text-[var(--color-login-help)]">Need help? Contact your administrator to reset your password.</p>
              </div>
            </div>

            {errorMessage && <p role="alert" className="rounded-lg border border-[var(--color-danger-border-soft)] bg-[var(--color-danger-wash-soft)] px-3 py-2 text-sm text-[var(--color-danger-text)]">{errorMessage}</p>}
            {lockoutSeconds > 0 && <p role="status" aria-live="polite" className="text-xs text-[var(--color-warning-ink)]">Try again in {lockoutSeconds} seconds.</p>}

            <button
              type="submit"
              disabled={disabled || !email.trim() || !password}
              className="group flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[var(--color-login-primary)] px-5 text-[15px] font-semibold text-white shadow-[0_10px_25px_var(--color-login-shadow)] transition hover:bg-[var(--color-login-primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-7 flex items-center gap-4 text-xs text-[var(--color-login-placeholder)]">
            <span className="h-px flex-1 bg-[var(--color-login-divider)]" /><span>or</span><span className="h-px flex-1 bg-[var(--color-login-divider)]" />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleGoogleLogin}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-[var(--color-login-rule)] bg-white px-5 text-[15px] font-medium text-[var(--color-login-ink-soft)] transition hover:border-[var(--color-login-rule-hover)] hover:bg-[var(--color-login-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--color-accent)]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            <span>{oauthLoading ? "Connecting…" : "Sign in with Google"}</span>
          </button>

          <p className="mt-12 text-center text-xs text-[var(--color-login-footer)]">Operation System, internal use only</p>
        </div>
      </section>
    </main>
  );
}
