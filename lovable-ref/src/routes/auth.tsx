import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Futfi8" },
      { name: "description", content: "Sign in to claim your locker room and join the fight." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      // Check if profile exists, route accordingly
      supabase.from("profiles").select("club_id").eq("id", user.id).maybeSingle().then(({ data }) => {
        if (data) navigate({ to: "/room/$clubId", params: { clubId: data.club_id } });
        else navigate({ to: "/onboarding" });
      });
    }
  }, [user, loading, navigate]);

  async function onGoogle() {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
    }
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl tracking-wide text-chalk">FUT</span>
            <span className="font-display text-2xl tracking-wide text-primary">FI8</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Door check</div>
          <h1 className="mt-3 text-display text-5xl text-chalk">
            {mode === "signup" ? "Claim your seat." : "Step in."}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "signup"
              ? "One room. Your club. Your voice."
              : "Welcome back. The room's been loud."}
          </p>
        </div>

        <button
          onClick={onGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-sm border border-border bg-card px-4 py-3 text-sm font-bold uppercase tracking-widest text-chalk transition hover:border-primary disabled:opacity-50"
        >
          <span aria-hidden>G</span> Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={onEmail} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-input px-4 py-3 text-sm text-chalk focus:border-primary focus:outline-none"
              placeholder="you@matchday.com"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-input px-4 py-3 text-sm text-chalk focus:border-primary focus:outline-none"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-sm bg-primary px-5 py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            {mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="text-center text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-chalk"
        >
          {mode === "signup" ? "Have an account? Sign in" : "New here? Create account"}
        </button>
      </main>
    </div>
  );
}
