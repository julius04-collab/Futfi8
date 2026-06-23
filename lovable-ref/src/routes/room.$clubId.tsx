import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CLUBS } from "@/lib/clubs";
import { ClubCrest } from "@/components/club-crest";
import { SiteNav } from "@/components/site-nav";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useCountdown } from "@/lib/use-countdown";
import { toast } from "sonner";

export const Route = createFileRoute("/room/$clubId")({
  loader: ({ params }) => {
    const club = CLUBS.find((c) => c.id === params.clubId);
    if (!club) throw notFound();
    return { club };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.club.name} Locker Room — Futfi8` : "Locker Room" },
      {
        name: "description",
        content: loaderData
          ? `Inside the ${loaderData.club.name} locker room. Live takes, raid windows, fan cred.`
          : "Locker room.",
      },
    ],
  }),
  component: RoomPage,
});

type Message = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile?: { handle: string; club_id: string; cred: number } | null;
};

type Raid = {
  id: string;
  home_club: string;
  away_club: string;
  ends_at: string;
};

function RoomPage() {
  const { club } = Route.useLoaderData();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const isMember = profile?.club_id === club.id;

  // Chat messages
  const msgQ = useQuery({
    queryKey: ["room", club.id, "messages"],
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("room_messages")
        .select("id, body, created_at, user_id, profile:profiles!room_messages_user_id_profile_fkey(handle, club_id, cred)")
        .eq("club_id", club.id)
        .order("created_at", { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data as unknown as Message[]).reverse();
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`room:${club.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_messages", filter: `club_id=eq.${club.id}` },
        () => qc.invalidateQueries({ queryKey: ["room", club.id, "messages"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raid_messages" },
        () => qc.invalidateQueries({ queryKey: ["room", club.id, "raids"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "raids" },
        () => qc.invalidateQueries({ queryKey: ["room", club.id, "raids"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [club.id, qc]);

  // Active raids targeting this room (away_club=club.id, still open) and outgoing (home_club=club.id)
  const raidQ = useQuery({
    queryKey: ["room", club.id, "raids"],
    queryFn: async () => {
      const nowIso = new Date().toISOString();
      const [incoming, outgoing] = await Promise.all([
        supabase
          .from("raids")
          .select("id, home_club, away_club, ends_at")
          .eq("away_club", club.id)
          .gt("ends_at", nowIso)
          .order("ends_at", { ascending: true }),
        supabase
          .from("raids")
          .select("id, home_club, away_club, ends_at")
          .eq("home_club", club.id)
          .gt("ends_at", nowIso)
          .order("ends_at", { ascending: true }),
      ]);
      return {
        incoming: (incoming.data ?? []) as Raid[],
        outgoing: (outgoing.data ?? []) as Raid[],
      };
    },
  });

  // Members ranked by cred
  const membersQ = useQuery({
    queryKey: ["room", club.id, "members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("handle, cred, avatar_url")
        .eq("club_id", club.id)
        .order("cred", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  // Pinned hot takes for this club
  const pinnedQ = useQuery({
    queryKey: ["room", club.id, "pinned"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("takes")
        .select("id, body, score, profile:profiles!takes_user_id_profile_fkey(handle)")
        .eq("club_id", club.id)
        .order("score", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as { id: string; body: string; score: number; profile: { handle: string } | null }[];
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${club.primary}, ${club.secondary})` }}
      />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <header className="flex items-center gap-4">
            <ClubCrest club={club} size={64} />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">// Locker room</div>
              <h1 className="font-display text-4xl text-chalk sm:text-5xl">{club.name}</h1>
              <div className="mt-1 text-xs text-muted-foreground">{club.city}</div>
            </div>
          </header>

          <RaidPanel club={club} raids={raidQ.data} isMember={!!isMember} userId={user?.id ?? null} />

          <ChatFeed
            messages={msgQ.data ?? []}
            loading={msgQ.isLoading}
            isMember={!!isMember}
            userClubId={profile?.club_id ?? null}
            clubId={club.id}
            user={!!user}
          />
        </div>

        <aside className="space-y-6">
          <PinnedTakes pinned={pinnedQ.data ?? []} clubName={club.short} />
          <MembersList members={membersQ.data ?? []} />
        </aside>
      </main>
    </div>
  );
}

function ChatFeed({
  messages,
  loading,
  isMember,
  userClubId,
  clubId,
  user,
}: {
  messages: Message[];
  loading: boolean;
  isMember: boolean;
  userClubId: string | null;
  clubId: string;
  user: boolean;
}) {
  const [body, setBody] = useState("");
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("room_messages").insert({
        club_id: clubId,
        user_id: u.user.id,
        body: text,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["room", clubId, "messages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <section className="rounded-sm border border-border bg-card/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="font-display text-lg text-chalk">Room chat</div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </div>
      </div>
      <div ref={scrollRef} className="h-[480px] space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading the room…</div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Empty room. Drop the first take.
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="rounded-sm border border-border/60 bg-background/60 px-3 py-2">
              <div className="flex items-baseline gap-2 text-xs">
                <span className="font-mono text-chalk">@{m.profile?.handle ?? "unknown"}</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {m.profile && (
                  <span className="ml-auto font-mono text-[10px] text-primary">{m.profile.cred} cred</span>
                )}
              </div>
              <div className="mt-1 text-sm text-chalk">{m.body}</div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-3">
        {!user ? (
          <Link
            to="/auth"
            className="block w-full rounded-sm bg-primary px-4 py-3 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground"
          >
            Sign in to drop a take
          </Link>
        ) : !isMember ? (
          <div className="rounded-sm border border-border bg-background/60 px-3 py-3 text-center text-xs font-mono uppercase tracking-widest text-muted-foreground">
            {userClubId ? "You're not a member of this room — visit your own room to post." : "Set up your profile to post."}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = body.trim();
              if (!trimmed) return;
              send.mutate(trimmed);
            }}
            className="flex gap-2"
          >
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={280}
              placeholder="Say something…"
              className="flex-1 rounded-sm border border-border bg-input px-3 py-2 text-sm text-chalk focus:border-primary focus:outline-none"
            />
            <button
              disabled={send.isPending || !body.trim()}
              className="rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

function RaidPanel({
  club,
  raids,
  isMember,
  userId,
}: {
  club: { id: string; short: string };
  raids: { incoming: Raid[]; outgoing: Raid[] } | undefined;
  isMember: boolean;
  userId: string | null;
}) {
  const incoming = raids?.incoming ?? [];
  const outgoing = raids?.outgoing ?? [];
  const first = incoming[0] ?? outgoing[0];
  const cd = useCountdown(first?.ends_at ?? null);
  const isIncoming = !!incoming[0];
  const opponentId = first ? (isIncoming ? first.home_club : first.away_club) : null;
  const opponent = opponentId ? CLUBS.find((c) => c.id === opponentId) : null;

  // Start a raid (only available to home members against a chosen target)
  const [target, setTarget] = useState("");
  const startRaid = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error("Pick a rival");
      const { error } = await supabase.from("raids").insert({
        home_club: club.id,
        away_club: target,
      });
      if (error) throw error;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
    onSuccess: () => toast.success("Raid window open. 2 hours."),
  });

  // Raid posts feed (for first raid)
  const raidPostsQ = useQuery({
    queryKey: ["raid", first?.id, "posts"],
    enabled: !!first,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase
        .from("raid_messages")
        .select("id, body, created_at, user_id, profile:profiles!raid_messages_user_id_profile_fkey(handle, club_id, cred)")
        .eq("raid_id", first!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Message[];
    },
  });

  const [raidBody, setRaidBody] = useState("");
  const qc = useQueryClient();
  const postRaid = useMutation({
    mutationFn: async () => {
      if (!first || !userId) throw new Error("No active raid");
      const trimmed = raidBody.trim();
      if (!trimmed) throw new Error("Empty");
      const { error } = await supabase.from("raid_messages").insert({
        raid_id: first.id,
        user_id: userId,
        body: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRaidBody("");
      qc.invalidateQueries({ queryKey: ["raid", first?.id, "posts"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const rivals = useMemo(() => CLUBS.filter((c) => c.id !== club.id), [club.id]);

  return (
    <section
      className={`relative overflow-hidden rounded-sm border-2 ${first ? "border-primary" : "border-border"} bg-card/60`}
    >
      {first && <div className="absolute inset-x-0 top-0 raid-stripe h-1 opacity-60" />}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${first ? "bg-primary animate-pulse" : "bg-muted"}`} />
          <div className="font-display text-lg text-chalk">
            {first ? (isIncoming ? "Under raid" : "Raid in progress") : "No active raid"}
          </div>
        </div>
        {first && (
          <div className="font-mono text-sm text-primary">{cd.label} <span className="text-muted-foreground text-[10px] uppercase tracking-widest">left</span></div>
        )}
      </div>

      {first && opponent ? (
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isIncoming ? (
              <>
                <ClubCrest club={opponent} size={32} />
                <span>
                  <span className="text-chalk">{opponent.name}</span> beat you. Their fans are posting on your wall for {cd.label}.
                </span>
              </>
            ) : (
              <>
                <span>You're raiding</span>
                <ClubCrest club={opponent} size={32} />
                <span className="text-chalk">{opponent.name}</span>
                <span>for the next {cd.label}.</span>
              </>
            )}
          </div>

          {/* Posting box — only if user belongs to home_club (raiding side) */}
          {!isIncoming && isMember && userId && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                postRaid.mutate();
              }}
              className="flex gap-2"
            >
              <input
                value={raidBody}
                onChange={(e) => setRaidBody(e.target.value)}
                maxLength={240}
                placeholder={`Drop a raid post on ${opponent.short}…`}
                className="flex-1 rounded-sm border border-primary/60 bg-background px-3 py-2 text-sm text-chalk focus:border-primary focus:outline-none"
              />
              <button
                disabled={postRaid.isPending || !raidBody.trim()}
                className="rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
              >
                Raid
              </button>
            </form>
          )}

          <div className="space-y-2">
            {(raidPostsQ.data ?? []).slice(0, 6).map((m) => {
              const club = CLUBS.find((c) => c.id === m.profile?.club_id);
              return (
                <div key={m.id} className="flex gap-3 rounded-sm border border-border bg-background/60 p-3">
                  {club && <ClubCrest club={club} size={28} />}
                  <div className="flex-1">
                    <div className="font-mono text-[10px] text-muted-foreground">@{m.profile?.handle ?? "unknown"}</div>
                    <div className="mt-1 text-sm text-chalk">"{m.body}"</div>
                  </div>
                </div>
              );
            })}
            {raidPostsQ.data?.length === 0 && (
              <div className="text-xs text-muted-foreground">No raid posts yet.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">
            When {club.short} wins a fixture, you can open a 2-hour raid window into the rival room.
          </p>
          {isMember && userId ? (
            <div className="flex gap-2">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="flex-1 rounded-sm border border-border bg-input px-3 py-2 text-sm text-chalk focus:border-primary focus:outline-none"
              >
                <option value="">Pick a rival…</option>
                {rivals.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={() => startRaid.mutate()}
                disabled={!target || startRaid.isPending}
                className="rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-40"
              >
                Open raid · 2h
              </button>
            </div>
          ) : (
            <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Only {club.short} members can open a raid.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function PinnedTakes({ pinned, clubName }: { pinned: { id: string; body: string; score: number; profile: { handle: string } | null }[]; clubName: string }) {
  return (
    <section className="rounded-sm border border-border bg-card/60">
      <div className="border-b border-border px-4 py-3 font-display text-lg text-chalk">Pinned hot takes</div>
      <div className="space-y-3 p-4">
        {pinned.length === 0 ? (
          <div className="text-xs text-muted-foreground">No takes from {clubName} fans yet.</div>
        ) : (
          pinned.map((p) => (
            <div key={p.id} className="rounded-sm border border-border/60 bg-background/60 p-3">
              <p className="text-sm text-chalk">"{p.body}"</p>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>@{p.profile?.handle ?? "anon"}</span>
                <span className="text-primary">▲ {p.score}</span>
              </div>
            </div>
          ))
        )}
        <Link
          to="/takes"
          className="block pt-2 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-chalk"
        >
          Open hot take board →
        </Link>
      </div>
    </section>
  );
}

function MembersList({ members }: { members: { handle: string; cred: number; avatar_url: string | null }[] }) {
  return (
    <section className="rounded-sm border border-border bg-card/60">
      <div className="border-b border-border px-4 py-3 font-display text-lg text-chalk">Top voices</div>
      <ol className="divide-y divide-border">
        {members.length === 0 ? (
          <li className="px-4 py-4 text-xs text-muted-foreground">No members yet. Be first.</li>
        ) : (
          members.map((m, i) => (
            <li key={m.handle} className="grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-display text-lg text-primary">{i + 1}</span>
              <span className="text-chalk">@{m.handle}</span>
              <span className="font-mono text-xs text-muted-foreground">{m.cred}</span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
