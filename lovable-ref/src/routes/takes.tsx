import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS } from "@/lib/clubs";
import { ClubCrest } from "@/components/club-crest";
import { SiteNav } from "@/components/site-nav";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

export const Route = createFileRoute("/takes")({
  head: () => ({
    meta: [
      { title: "Hot Takes — Futfi8" },
      { name: "description", content: "The global hot take board. Every club, every fan, every loud opinion." },
    ],
  }),
  component: TakesPage,
});

type Take = {
  id: string;
  body: string;
  score: number;
  club_id: string;
  created_at: string;
  user_id: string;
  profile: { handle: string } | null;
};

function TakesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [filter, setFilter] = useState<string>("");
  const [sort, setSort] = useState<"hot" | "new">("hot");
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["takes", filter, sort],
    queryFn: async (): Promise<Take[]> => {
      let qb = supabase
        .from("takes")
        .select("id, body, score, club_id, created_at, user_id, profile:profiles!takes_user_id_profile_fkey(handle)")
        .limit(80);
      if (filter) qb = qb.eq("club_id", filter);
      qb = sort === "hot"
        ? qb.order("score", { ascending: false }).order("created_at", { ascending: false })
        : qb.order("created_at", { ascending: false });
      const { data, error } = await qb;
      if (error) throw error;
      return data as unknown as Take[];
    },
  });

  const votesQ = useQuery({
    queryKey: ["my-votes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("take_votes")
        .select("take_id, value")
        .eq("user_id", user!.id);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const v of data) map[v.take_id] = v.value;
      return map;
    },
  });

  const vote = useMutation({
    mutationFn: async ({ takeId, value }: { takeId: string; value: 1 | -1 }) => {
      if (!user) throw new Error("Sign in to vote");
      const current = votesQ.data?.[takeId];
      if (current === value) {
        const { error } = await supabase.from("take_votes").delete().eq("take_id", takeId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("take_votes")
          .upsert({ take_id: takeId, user_id: user.id, value }, { onConflict: "take_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["takes"] });
      qc.invalidateQueries({ queryKey: ["my-votes"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [body, setBody] = useState("");
  const post = useMutation({
    mutationFn: async () => {
      if (!user || !profile) throw new Error("Sign in first");
      const trimmed = body.trim();
      if (trimmed.length < 4) throw new Error("Say more");
      const { error } = await supabase.from("takes").insert({
        user_id: user.id,
        club_id: profile.club_id,
        body: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["takes"] });
      toast.success("Take posted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const clubsById = useMemo(() => Object.fromEntries(CLUBS.map((c) => [c.id, c])), []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Cross-club feed</div>
        <h1 className="mt-3 text-display text-5xl text-chalk sm:text-6xl">The Hot Take Board</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Every club. Every fan. One feed. Best takes float — worst takes die alone.
        </p>

        {/* Composer */}
        <section className="mt-8 rounded-sm border border-border bg-card/60 p-4">
          {!user ? (
            <Link
              to="/auth"
              className="block w-full rounded-sm bg-primary px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground"
            >
              Sign in to drop a take
            </Link>
          ) : !profile ? (
            <Link
              to="/onboarding"
              className="block w-full rounded-sm bg-primary px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground"
            >
              Pick your club to start posting
            </Link>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                post.mutate();
              }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Posting as <span className="font-mono text-chalk">@{profile.handle}</span>
                <span>·</span>
                <span className="font-mono uppercase tracking-widest text-primary">{clubsById[profile.club_id]?.abbr}</span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={280}
                rows={3}
                placeholder="What's the take?"
                className="w-full rounded-sm border border-border bg-input px-3 py-2 text-sm text-chalk focus:border-primary focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">{280 - body.length} left</span>
                <button
                  disabled={post.isPending || body.trim().length < 4}
                  className="rounded-sm bg-primary px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
                >
                  Post take
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 font-mono text-[10px] uppercase tracking-widest">
            {(["hot", "new"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`rounded-sm border px-3 py-1.5 ${
                  sort === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-chalk"
                }`}
              >
                {s === "hot" ? "🔥 Hot" : "Newest"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFilter("")}
              className={`rounded-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
                filter === "" ? "border-chalk text-chalk" : "border-border text-muted-foreground"
              }`}
            >
              All clubs
            </button>
            {CLUBS.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                  filter === c.id ? "border-primary text-chalk" : "border-border text-muted-foreground hover:text-chalk"
                }`}
              >
                {c.abbr}
              </button>
            ))}
          </div>
        </div>

        {/* Feed */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {q.isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {q.data?.length === 0 && !q.isLoading && (
            <div className="text-sm text-muted-foreground">No takes here yet. Be the first.</div>
          )}
          {q.data?.map((t) => {
            const club = clubsById[t.club_id];
            const myVote = votesQ.data?.[t.id];
            return (
              <article key={t.id} className="flex gap-3 rounded-sm border border-border bg-card p-4 transition hover:border-primary">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => (user ? vote.mutate({ takeId: t.id, value: 1 }) : toast.error("Sign in to vote"))}
                    className={`text-lg leading-none transition ${myVote === 1 ? "text-primary" : "text-muted-foreground hover:text-chalk"}`}
                  >
                    ▲
                  </button>
                  <span className="font-display text-sm text-chalk">{t.score}</span>
                  <button
                    onClick={() => (user ? vote.mutate({ takeId: t.id, value: -1 }) : toast.error("Sign in to vote"))}
                    className={`text-lg leading-none transition ${myVote === -1 ? "text-primary" : "text-muted-foreground hover:text-chalk"}`}
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {club && <ClubCrest club={club} size={28} />}
                    <div className="text-sm text-chalk">@{t.profile?.handle ?? "anon"}</div>
                    {club && (
                      <Link
                        to="/room/$clubId"
                        params={{ clubId: club.id }}
                        className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-chalk"
                      >
                        {club.abbr}
                      </Link>
                    )}
                  </div>
                  <p className="mt-2 font-display text-lg leading-snug text-chalk">"{t.body}"</p>
                  <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
