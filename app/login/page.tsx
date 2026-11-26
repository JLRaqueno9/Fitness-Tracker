"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name } },
      });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        router.push("/");
        router.refresh();
        return;
      } else {
        setMessage("Account created. Check your email to confirm it, then log in.");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage(error.message);
      } else {
        router.push("/");
        router.refresh();
        return;
      }
    }
    setBusy(false);
  }

  return (
    <main className="grid min-h-dvh md:grid-cols-2">
      <section className="flex flex-col justify-between gap-10 bg-hero p-8 text-on-hero md:p-12">
        <p className="flex items-center gap-2.5 font-display text-2xl font-bold leading-none">
          <span aria-hidden="true" className="block h-6 w-2 rounded-sm bg-accent" />
          Fitness Test Tracker
        </p>
        <div>
          <h1 className="font-display text-6xl font-bold leading-[1] md:text-7xl">
            <span className="block">Log the test.</span>
            <span className="block">Train the gap.</span>
          </h1>
          <p className="mt-5 max-w-sm text-hero-muted">
            Track your beep test, sprints, jumps and lifts, then get a routine built around what is
            holding you back.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <div className="seg mb-6" role="tablist" aria-label="Sign in or create an account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="name" className="label">
                  Your name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  className="field"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="field"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
                className="field"
              />
              {mode === "signup" && (
                <p className="mt-1.5 text-sm text-muted">Use at least 8 characters.</p>
              )}
            </div>

            <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full">
              {busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          {message && (
            <p role="alert" className="notice notice-bad mt-4">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
