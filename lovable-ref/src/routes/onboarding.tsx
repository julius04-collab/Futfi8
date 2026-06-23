import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { CLUBS } from "@/lib/clubs";
import { ClubCrest } from "@/components/club-crest";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Pick your locker room — Futfi8" }] }),
  component: Onboarding,
});

const HandleSchema = z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_.]+$/, "letters, numbers, _ or .");

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, loading } = useAuth();
  const [handle, setHandle] = useState("");
  const [club, setClub] = useState("");
  const [bio, setBio] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = HandleSchema.safeParse(handle);
    if (!parsed.success) return toast.error(parsed.error.errors[0]?.message ?? "Invalid handle");
    if (!club) return toast.error("Pick your home club");
    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      handle: parsed.data,
      club_id: club,
      bio: bio.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Handle is taken" : error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/room/$clubId", params: { clubId: club } });
  }

  if (loading || !user) return null;

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
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Set your colours</div>
        <h1 className="mt-3 text-display text-5xl text-chalk sm:text-6xl">Pick a handle. Pick a room.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          You can only post in your home room — or in a rival room you've earned the right to raid. Choose wisely.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-8">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">01 · Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              maxLength={24}
              placeholder="kojo_gunner"
              className="mt-2 w-full rounded-sm border border-border bg-input px-4 py-3 font-mono text-sm text-chalk focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">02 · Your home club</label>
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {CLUBS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setClub(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-sm border p-2 transition ${
                    club === c.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <ClubCrest club={c} size={36} />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.abbr}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">03 · Bio (optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={140}
              rows={2}
              placeholder="One line. Make it count."
              className="mt-2 w-full rounded-sm border border-border bg-input px-4 py-3 text-sm text-chalk focus:border-primary focus:outline-none"
            />
          </div>

          <button
            disabled={busy}
            type="submit"
            className="w-full rounded-sm bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:opacity-50"
          >
            Enter the room →
          </button>
        </form>
      </main>
    </div>
  );
}
