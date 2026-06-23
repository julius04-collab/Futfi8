import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import heroTunnel from "@/assets/hero-tunnel.jpg";
import raidNote from "@/assets/raid-note.jpg";
import { CLUBS, type Club } from "@/lib/clubs";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Futfi8 — The football. The fight." },
      { name: "description", content: "Locker rooms for every Premier League club. Win a match, raid your rival. The matchday-powered fan community." },
      { property: "og:title", content: "Futfi8 — The football. The fight." },
      { property: "og:description", content: "Locker rooms for every Premier League club. Win a match, raid your rival." },
    ],
  }),
  component: LandingPage,
});

function ClubCrest({ club, size = 44 }: { club: Club; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-sm font-display text-[0.78rem] font-normal tracking-wider shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${club.primary} 0%, ${club.secondary} 100%)`,
        color: "#fff",
        textShadow: "0 1px 2px rgba(0,0,0,0.6)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}
      aria-label={club.name}
    >
      {club.abbr}
    </div>
  );
}

function Nav() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl tracking-wide text-chalk">FUT</span>
          <span className="font-display text-2xl tracking-wide text-primary">FI8</span>
          <span className="ml-1 hidden text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground sm:inline">/ fight</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#raid" className="hover:text-chalk transition">The Raid</a>
          <a href="#rooms" className="hover:text-chalk transition">Locker Rooms</a>
          <Link to="/takes" className="hover:text-chalk transition">Hot Takes</Link>
          <a href="#cred" className="hover:text-chalk transition">Fan Cred</a>
        </nav>
        {user && profile ? (
          <Link
            to="/room/$clubId"
            params={{ clubId: profile.club_id }}
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110"
          >
            Enter my room →
          </Link>
        ) : (
          <Link
            to="/auth"
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110"
          >
            Claim your room
          </Link>
        )}
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <img
          src={heroTunnel}
          alt=""
          width={1600}
          height={1200}
          className="h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 stadium-vignette" />
        <div className="absolute inset-0 bg-grain" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:pb-32 lg:pt-32">
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-primary">
          <span className="h-px w-8 bg-primary" />
          Pre-launch · Premier League · 20 clubs
        </div>

        <h1 className="mt-6 text-display text-6xl text-chalk sm:text-8xl lg:text-[10rem]">
          The football.
          <br />
          <span className="text-primary">The fight.</span>
        </h1>

        <p className="mt-8 max-w-xl text-base text-muted-foreground sm:text-lg">
          Futfi8 gives every Premier League club a dedicated locker room. Post takes, react to match events,
          build a name as a top voice for your side. Then your team wins —
          <span className="text-chalk"> and you raid the rivals.</span>
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#waitlist"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-primary px-7 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 pulse-raid"
          >
            Join the waitlist
            <span aria-hidden>→</span>
          </a>
          <a
            href="#raid"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-border bg-card/40 px-7 text-sm font-bold uppercase tracking-widest text-chalk transition hover:bg-card"
          >
            How a raid works
          </a>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-border/60 pt-8">
          {[
            { k: "20", v: "Clubs live at launch" },
            { k: "2h", v: "Raid window per win" },
            { k: "1", v: "Home room. Your voice." },
          ].map((s) => (
            <div key={s.v}>
              <dt className="font-display text-4xl text-chalk sm:text-5xl">{s.k}</dt>
              <dd className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Marquee */}
      <div className="border-y border-border bg-card/30 py-3 overflow-hidden">
        <div className="marquee flex w-max items-center gap-10 whitespace-nowrap font-display text-lg uppercase tracking-wider text-muted-foreground">
          {Array.from({ length: 2 }).flatMap((_, i) =>
            CLUBS.map((c) => (
              <span key={`${i}-${c.id}`} className="flex items-center gap-3">
                <ClubCrest club={c} size={26} />
                {c.name}
                <span className="text-primary">·</span>
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function RaidSection() {
  return (
    <section id="raid" className="relative border-b border-border py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-border">
            <img src={raidNote} alt="A taped raid note pinned to a rival locker" width={1200} height={1200} loading="lazy" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Raid · Live</div>
              <div className="mt-1 font-display text-2xl text-chalk">"Pack it up, Spurs."</div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span>by @kojo_gunner · ARS</span>
                <span>·</span>
                <span>1h 41m left on the door</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 -top-3 rotate-3 bg-primary px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
            Raid window open
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Core mechanic</div>
          <h2 className="mt-4 text-display text-5xl text-chalk sm:text-6xl">
            Win a match.<br />Raid the rivals.
          </h2>
          <p className="mt-6 max-w-lg text-base text-muted-foreground">
            When your club wins, your locker room earns a 2-hour Raid Window — the right to enter
            the losing club's room and post a single take. The losers can react and reply,
            but the post stays pinned until the timer hits zero.
          </p>

          <ol className="mt-10 space-y-6">
            {[
              { t: "Match finishes", d: "We watch every Premier League fixture. The whistle blows and the engine fires.", n: "01" },
              { t: "Window opens", d: "Your locker room gets a 2-hour raid window into the losing rival's room.", n: "02" },
              { t: "One take. One door.", d: "A single post lands on their wall. Pinned. Visible. Loud.", n: "03" },
              { t: "Room seals", d: "Timer expires, the raid is archived to history. Receipts forever.", n: "04" },
            ].map((step) => (
              <li key={step.n} className="grid grid-cols-[auto_1fr] gap-5 border-l-2 border-border pl-5 hover:border-primary transition">
                <div className="font-display text-3xl text-primary">{step.n}</div>
                <div>
                  <div className="font-display text-xl text-chalk">{step.t}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function RoomsSection() {
  return (
    <section id="rooms" className="relative border-b border-border py-24 sm:py-32 scoreboard-grid">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// 20 rooms · 20 tribes</div>
            <h2 className="mt-4 text-display text-5xl text-chalk sm:text-6xl">Pick your locker room</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              One home room. Your club. Your voice. Follow others to scout the chatter — but you only
              post in your colours, or in a rival room you've earned the right to raid.
            </p>
          </div>
          <div className="rounded-sm border border-border bg-card/60 px-4 py-3 font-mono text-xs text-muted-foreground">
            <span className="text-primary">●</span> Live · 2026/27 season
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {CLUBS.map((club) => (
            <Link
              key={club.id}
              to="/room/$clubId"
              params={{ clubId: club.id }}
              className="group relative overflow-hidden rounded-sm border border-border bg-card p-5 transition hover:border-primary"
            >
              <div
                className="absolute inset-x-0 top-0 h-1 opacity-70 transition group-hover:opacity-100"
                style={{ background: `linear-gradient(90deg, ${club.primary}, ${club.secondary})` }}
              />
              <div className="flex items-start justify-between gap-3">
                <ClubCrest club={club} size={52} />
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  #{club.abbr}
                </div>
              </div>
              <div className="mt-4">
                <div className="font-display text-xl text-chalk leading-tight">{club.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{club.city}</div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                <span className="text-muted-foreground">Locker room</span>
                <span className="text-primary opacity-0 transition group-hover:opacity-100">Enter →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FanCredSection() {
  const milestones = [
    { tier: "Rookie", at: "0", perk: "Post takes, react, vote", color: "muted-foreground" },
    { tier: "OG", at: "500", perk: "OG badge · custom flair", color: "chalk" },
    { tier: "Captain", at: "1,200", perk: "Pin a take in your room", color: "accent" },
    { tier: "Legend", at: "2,000", perk: "Legend mark · raid history spotlight", color: "primary" },
  ];

  return (
    <section id="cred" className="relative border-b border-border py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Reputation</div>
            <h2 className="mt-4 text-display text-5xl text-chalk sm:text-6xl">
              Fan Cred.<br />Earned, not bought.
            </h2>
            <p className="mt-6 max-w-md text-muted-foreground">
              A score per user, per locker room. Non-transferable. Your Arsenal Cred is yours — and it
              means nothing in the Spurs room. Quality takes over volume. Defence over noise.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {["Upvotes on posts", "Raid posts that pop", "Matchday streaks", "Successful raid defences"].map((x) => (
                <li key={x} className="flex items-center gap-3 rounded-sm border border-border bg-card/60 px-3 py-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-card/60 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="font-display text-lg text-chalk">Leaderboard · Arsenal Room</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Wk 14</div>
            </div>

            <ol className="mt-4 divide-y divide-border">
              {[
                { rank: 1, user: "kojo_gunner", cred: 2410, tag: "Legend" },
                { rank: 2, user: "afolabi_AFC", cred: 1880, tag: "Captain" },
                { rank: 3, user: "nneka.10", cred: 1325, tag: "Captain" },
                { rank: 4, user: "tega_north", cred: 940, tag: "OG" },
                { rank: 5, user: "you?", cred: 0, tag: "—" },
              ].map((r) => (
                <li key={r.rank} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 py-3">
                  <span className="font-display text-2xl text-primary">{r.rank}</span>
                  <span className="text-sm text-chalk">@{r.user}</span>
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{r.tag}</span>
                  <span className="font-display text-lg text-chalk">{r.cred.toLocaleString()}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 border-t border-border pt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Milestones</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {milestones.map((m) => (
                  <div key={m.tier} className="rounded-sm border border-border bg-background/60 p-3">
                    <div className="font-display text-xl text-chalk">{m.tier}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{m.at} Cred</div>
                    <div className="mt-2 text-[11px] leading-snug text-muted-foreground">{m.perk}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const HOT_TAKES = [
  { user: "nneka.10", club: "ars", body: "Saka for Ballon d'Or top 3. Argue with the wall.", up: 482 },
  { user: "tegz_KOP", club: "liv", body: "Anfield on a European night is still the best atmosphere in world football. Madrid is karaoke.", up: 396 },
  { user: "afobaje", club: "che", body: "Cole Palmer is the most complete English 10 since Gazza. Pack it up.", up: 311 },
  { user: "bayo_MUFC", club: "mun", body: "Tell me Garnacho doesn't terrify you and I'll tell you you don't watch football.", up: 277 },
  { user: "kwame_THFC", club: "tot", body: "Top 4 this year. Bookmark it. The reckoning is coming.", up: 188 },
  { user: "dami_blue", club: "mci", body: "We've made winning the league look so boring you all forgot how hard it is.", up: 421 },
];

function HotTakeSection() {
  return (
    <section id="hot" className="relative border-b border-border py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Cross-club feed</div>
            <h2 className="mt-4 text-display text-5xl text-chalk sm:text-6xl">The Hot Take Board</h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Non-matchdays still cook. A global feed where any fan posts about any club, any match.
              Best takes float. Worst takes die alone.
            </p>
          </div>
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            {["Last 24h", "This week", "All time"].map((f, i) => (
              <span key={f} className={`rounded-sm border px-3 py-1.5 ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {HOT_TAKES.map((t, i) => {
            const club = CLUBS.find((c) => c.id === t.club)!;
            return (
              <article key={i} className="group flex flex-col justify-between gap-4 rounded-sm border border-border bg-card p-5 transition hover:border-primary">
                <div className="flex items-center gap-3">
                  <ClubCrest club={club} size={36} />
                  <div>
                    <div className="text-sm text-chalk">@{t.user}</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{club.name}</div>
                  </div>
                </div>
                <p className="font-display text-xl leading-snug text-chalk">"{t.body}"</p>
                <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="text-primary">▲</span> {t.up}</span>
                  <span>🔥 · 😂 · 💀</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WaitlistSection() {
  const [club, setClub] = useState<string>("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const chosen = useMemo(() => CLUBS.find((c) => c.id === club), [club]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !club) return;
    setSubmitted(true);
  }

  return (
    <section id="waitlist" className="relative overflow-hidden border-b border-border py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 raid-stripe opacity-[0.06]" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-primary">// Founding members</div>
          <h2 className="mt-4 text-display text-5xl text-chalk sm:text-7xl">
            Claim your<br />locker. Early.
          </h2>
          <p className="mt-6 max-w-md text-muted-foreground">
            We're seeding all 20 rooms with founding members before public launch. Pick your home club.
            First in gets the first OG badge, a permanent founder flair, and the loudest mic on day one.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-muted-foreground">
            {["Founder badge — permanent", "First raid rights at launch", "Direct line to the build team"].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="font-display text-primary">✕</span> {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
          {submitted && chosen ? (
            <div className="flex h-full flex-col items-start justify-center gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary">Confirmed</div>
              <ClubCrest club={chosen} size={72} />
              <h3 className="font-display text-4xl text-chalk">You're in the {chosen.short} room.</h3>
              <p className="text-sm text-muted-foreground">
                We'll hit <span className="text-chalk">{email}</span> the moment the room opens. Sharpen your takes.
              </p>
              <button
                onClick={() => { setSubmitted(false); setEmail(""); setClub(""); }}
                className="mt-2 text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-chalk transition"
              >
                ← Add another email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  01 · Your home club
                </label>
                <div className="mt-3 grid max-h-64 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
                  {CLUBS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setClub(c.id)}
                      className={`flex flex-col items-center gap-1 rounded-sm border p-2 transition ${
                        club === c.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"
                      }`}
                      aria-pressed={club === c.id}
                    >
                      <ClubCrest club={c} size={32} />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{c.abbr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  02 · Your email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@matchday.com"
                  className="mt-3 w-full rounded-sm border border-border bg-input px-4 py-3 text-sm text-chalk placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!email || !club}
                className="group flex w-full items-center justify-between rounded-sm bg-primary px-5 py-4 text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                <span>Lock in my room</span>
                <span aria-hidden className="transition group-hover:translate-x-1">→</span>
              </button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                No spam. No nonsense. Just the door codes when we open the room.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl tracking-wide text-chalk">FUT</span>
            <span className="font-display text-2xl tracking-wide text-primary">FI8</span>
          </div>
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">
            Built in Lagos, for the loudest fans on the internet. Not affiliated with the Premier League or any club.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <a href="#raid" className="hover:text-chalk">The Raid</a>
          <a href="#rooms" className="hover:text-chalk">Rooms</a>
          <a href="#cred" className="hover:text-chalk">Fan Cred</a>
          <a href="#waitlist" className="hover:text-chalk">Waitlist</a>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          © 2026 Futfi8 · Fut + Fi8 + #8
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <RaidSection />
        <RoomsSection />
        <FanCredSection />
        <HotTakeSection />
        <WaitlistSection />
      </main>
      <Footer />
    </div>
  );
}
