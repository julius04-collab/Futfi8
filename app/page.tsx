'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'


type Club = {
  id: string
  name: string
  abbr: string
  primary: string
  secondary: string
  crest_url: string | null
}





function ClubCrest({ club, size = 44 }: { club: Club; size?: number }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className="flex items-center justify-center rounded-sm shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        background: !club.crest_url || imgError
          ? `linear-gradient(135deg, ${club.primary} 0%, ${club.secondary} 100%)`
          : 'transparent',
      }}
      aria-label={club.name}
    >
      {club.crest_url && !imgError ? (
        <img
          src={club.crest_url}
          alt={club.name}
          className="w-full h-full object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="font-display font-normal tracking-wider"
          style={{
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.6)',
            fontSize: `${Math.max(size * 0.35, 10)}px`,
          }}
        >
          {club.abbr}
        </span>
      )}
    </div>
  )
}

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
    >
      {children}
    </div>
  )
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-slate-800/60' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl tracking-wide text-white">FUT</span>
          <span className="font-display text-2xl tracking-wide text-accent-muted">FI8</span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
          <a href="#raid" className="hover:text-white transition">The Raid</a>
          <a href="#rooms" className="hover:text-white transition">Locker Rooms</a>
          <a href="#cred" className="hover:text-white transition">Fan Cred</a>
          <a href="#hot" className="hover:text-white transition">Hot Takes</a>
        </nav>
        <a
          href="#waitlist"
          className="inline-flex h-9 items-center gap-2 rounded-sm bg-accent-muted px-4 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-accent-muted"
        >
          Claim your room
        </a>
      </div>
    </header>
  )
}

function Hero({ clubs }: { clubs: Club[] }) {
  return (
    <section
      id="top"
      className="relative min-h-[85vh] flex flex-col justify-between bg-[url('/images/hero-tunnel.jpg')] bg-cover bg-center bg-black"
    >
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-between px-4 pb-24 pt-36 sm:px-6 sm:pt-32 lg:pb-32 lg:pt-40">
        <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-tighter whitespace-nowrap text-accent-muted">
          <span className="h-px w-8 bg-accent-muted shrink-0" />
          Pre-launch | Premier League | 20 clubs
        </div>

        <h1 className="mt-6 font-display text-6xl text-white sm:text-8xl lg:text-[10rem] leading-[0.9]">
          The football.
          <br />
          <span className="text-accent-muted">The fight.</span>
        </h1>

        <p className="mt-8 max-w-xl text-base text-slate-400 sm:text-lg leading-relaxed">
          Futfi8 gives every Premier League club a dedicated locker room. Post takes, react to match events,
          build a name as a top voice for your side. Then your team wins&mdash;
          <span className="text-white"> and you raid the rivals.</span>
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#waitlist"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-accent-muted px-7 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-accent-muted"
          >
            Join the waitlist
            <span aria-hidden>→</span>
          </a>
          <a
            href="#raid"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-slate-800/60 bg-black/40 px-7 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-slate-900"
          >
            How a raid works
          </a>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-slate-800/60 pt-8">
          {[
            { k: '20', v: 'Clubs live at launch' },
            { k: '2h', v: 'Raid window per win' },
            { k: '1', v: 'Home room. Your voice.' },
          ].map((s) => (
            <div key={s.v}>
              <dt className="font-display text-4xl text-white sm:text-5xl">{s.k}</dt>
              <dd className="mt-1 text-xs uppercase tracking-wider text-slate-500">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="border-y border-slate-800/60 bg-black/30 py-3 overflow-hidden">
        <div className="marquee flex w-max items-center gap-10 whitespace-nowrap font-display text-lg uppercase tracking-wider text-slate-500">
          {Array.from({ length: 2 }).flatMap((_, i) =>
            clubs.map((c) => (
              <span key={`${i}-${c.id}`} className="flex items-center gap-3">
                <ClubCrest club={c} size={26} />
                {c.name}
                <span className="text-accent-muted">·</span>
              </span>
            ))
          )}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </section>
  )
}

function RaidSection() {
  return (
    <section id="raid" className="relative border-b border-slate-800/60 bg-black py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-slate-800/60 bg-[url('/images/players/saka.jpg')] bg-cover bg-center">
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-end items-start p-8 md:p-12">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent-muted">Raid · Live</div>
              <div className="mt-3 font-display text-3xl text-white sm:text-4xl leading-tight">
                &ldquo;Pack it up, Spurs.&rdquo;
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 mb-1">
                <span>by @kojo_gunner · ARS</span>
                <span>·</span>
                <span>1h 41m left on the door</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-3 -top-3 rotate-3 bg-accent-muted px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white">
            Raid window open
          </div>
        </div>

        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-muted">// Core mechanic</div>
          <h2 className="mt-4 font-display text-5xl text-white sm:text-6xl leading-[0.9]">
            Win a match.
            <br />
            Raid the rivals.
          </h2>
          <p className="mt-6 max-w-lg text-base text-slate-400 leading-relaxed">
            When your club wins, your locker room earns a time-limited Raid Window &mdash; the right to enter
            the losing club&apos;s room and post a single take. The losers can react and reply,
            but the post stays pinned until the timer hits zero.
          </p>

          <ol className="mt-10 space-y-6">
            {[
              { t: 'Match finishes', d: 'We watch every Premier League fixture. The whistle blows and the engine fires.', n: '01' },
              { t: 'Window opens', d: 'Your locker room gets a 2-hour raid window into the losing rival\'s room.', n: '02' },
              { t: 'One take. One door.', d: 'A single post lands on their wall. Pinned. Visible. Loud.', n: '03' },
              { t: 'Room seals', d: 'Timer expires, the raid is archived to history. Receipts forever.', n: '04' },
            ].map((step) => (
              <li key={step.n} className="grid grid-cols-[auto_1fr] gap-5 border-l-2 border-slate-800 pl-5 hover:border-accent-muted transition">
                <div className="font-display text-3xl text-accent-muted">{step.n}</div>
                <div>
                  <div className="font-display text-xl text-white">{step.t}</div>
                  <p className="mt-1 text-sm text-slate-400">{step.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

function RoomsSection({ clubs }: { clubs: Club[] }) {
  const [selected, setSelected] = useState<string>('')
  const chosen = useMemo(() => clubs.find((c) => c.id === selected), [clubs, selected])

  return (
    <section id="rooms" className="relative border-b border-slate-800/60 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-muted">// 20 rooms · 20 tribes</div>
            <h2 className="mt-4 font-display text-5xl text-white sm:text-6xl leading-[0.9]">Pick your locker room</h2>
            <p className="mt-4 max-w-xl text-slate-400 leading-relaxed">
              One home room. Your club. Your voice. Follow others to scout the chatter &mdash; but you only
              post in your colours, or in a rival room you&apos;ve earned the right to raid.
            </p>
          </div>
          <div className="rounded-sm border border-slate-800/60 bg-slate-900/60 px-4 py-3 font-mono text-xs text-slate-500">
            <span className="text-accent-muted">●</span> Live · 2026/27 season
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {clubs.map((club) => {
            const isSelected = selected === club.id
            return (
              <button
                key={club.id}
                type="button"
                onClick={() => setSelected(club.id)}
                className={`group relative overflow-hidden rounded-sm border p-5 text-left transition ${
                  isSelected
                    ? 'border-accent-muted bg-accent-muted/10'
                    : 'border-slate-800/60 bg-slate-900/50 hover:border-accent-muted/50'
                }`}
                aria-pressed={isSelected}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 opacity-70 transition group-hover:opacity-100"
                  style={{ background: `linear-gradient(90deg, ${club.primary}, ${club.secondary})` }}
                />
                <div className="flex items-start justify-between gap-3">
                  <ClubCrest club={club} size={52} />
                  <div className={`font-mono text-[10px] uppercase tracking-widest ${isSelected ? 'text-accent-muted' : 'text-slate-600'}`}>
                    #{club.abbr}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="font-display text-xl text-white leading-tight">{club.name}</div>

                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                  <span className="text-slate-600">Locker room</span>
                  <span className={`transition ${isSelected ? 'text-accent-muted opacity-100' : 'text-accent-muted opacity-0 group-hover:opacity-100'}`}>
                    {isSelected ? 'Selected' : 'Select →'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

                {chosen && (
          <div className="mt-8 rounded-sm border border-accent-muted/30 bg-accent-muted/5 p-5 text-center">
            <p className="text-sm text-slate-400">
              You picked <span className="font-bold text-white">{chosen.name}</span>.{' '}
              <a href="#waitlist" className="text-accent-muted hover:text-accent-muted underline underline-offset-2">
                Claim your spot now →
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function FanCredSection() {
  const milestones = [
    { tier: 'Rookie', at: '0', perk: 'Post takes, react, vote' },
    { tier: 'OG', at: '500', perk: 'OG badge · custom flair' },
    { tier: 'Captain', at: '1,200', perk: 'Pin a take in your room' },
    { tier: 'Legend', at: '2,000', perk: 'Legend mark · raid history spotlight' },
  ]

  return (
    <section id="cred" className="relative border-b border-slate-800/60 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-muted">// Reputation</div>
            <h2 className="mt-4 font-display text-5xl text-white sm:text-6xl leading-[0.9]">
              Fan Cred.
              <br />
              Earned, not bought.
            </h2>
            <p className="mt-6 max-w-md text-slate-400 leading-relaxed">
              A score per user, per locker room. Non-transferable. Your Arsenal Cred is yours &mdash; and it
              means nothing in the Spurs room. Quality takes over volume. Defence over noise.
            </p>

            <ul className="mt-8 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {['Upvotes on posts', 'Raid posts that pop', 'Matchday streaks', 'Successful raid defences'].map((x) => (
                <li key={x} className="flex items-center gap-3 rounded-sm border border-slate-800/60 bg-slate-900/60 px-3 py-2 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-muted shrink-0" />
                  {x}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm border border-slate-800/60 bg-slate-900/60 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
              <div className="font-display text-lg text-white">Leaderboard · Arsenal Room</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Wk 14</div>
            </div>

            <div className="mt-4 rounded-sm border border-slate-800/60 bg-black/60 p-6 text-center">
              <p className="text-sm text-slate-400">No leaderboard data yet. Be the first to earn Fan Cred.</p>
            </div>

            <div className="mt-6 border-t border-slate-800/60 pt-6">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Milestones</div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {milestones.map((m) => (
                  <div key={m.tier} className="rounded-sm border border-slate-800/60 bg-black/60 p-3">
                    <div className="font-display text-xl text-white">{m.tier}</div>
                    <div className="font-mono text-[10px] text-accent-muted">{m.at} Cred</div>
                    <div className="mt-2 text-[11px] leading-snug text-slate-500">{m.perk}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HotTakeSection({ clubs }: { clubs: Club[] }) {
  const [takes, setTakes] = useState<{ user: string; club_id: string; body: string; up: number }[]>([])
  const [takesLoading, setTakesLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('posts')
        .select(`id, content, upvote_count, author:users!author_id(username, home_club_id)`)
        .eq('type', 'hot_take')
        .order('upvote_count', { ascending: false })
        .limit(6)
      if (data) {
        setTakes(data.map((p: any) => ({
          user: p.author?.username ?? 'anonymous',
          club_id: p.author?.home_club_id ?? '',
          body: p.content,
          up: p.upvote_count ?? 0,
        })))
      }
      setTakesLoading(false)
    })()
  }, [])

  return (
    <section id="hot" className="relative border-b border-slate-800/60 bg-black py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-muted">// Cross-club feed · The Hot Take Board</div>
            <h2 className="mt-4 font-display text-5xl text-white sm:text-6xl leading-[0.9]">The Hot Take Board</h2>
            <p className="mt-4 max-w-xl text-slate-400 leading-relaxed">
              Non-matchdays still cook. A global feed where any fan posts about any club, any match.
              Best takes float. Worst takes die alone.
            </p>
          </div>
          <div className="flex gap-2 font-mono text-[10px] uppercase tracking-widest">
            {['Last 24h', 'This week', 'All time'].map((f, i) => (
              <span
                key={f}
                className={`rounded-sm border px-3 py-1.5 transition ${
                  i === 0
                    ? 'border-accent-muted bg-accent-muted text-white'
                    : 'border-slate-800/60 text-slate-500 hover:border-slate-600'
                }`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {takesLoading ? (
            <p className="col-span-full text-sm text-slate-500">Loading takes...</p>
          ) : takes.length === 0 ? (
            <div className="col-span-full rounded-sm border border-slate-800/60 bg-slate-900/50 p-8 text-center">
              <p className="text-sm text-slate-400">No hot takes yet. Drop the first one in the Hot Take Board.</p>
            </div>
          ) : (
            takes.map((t, i) => {
              const club = clubs.find((c) => c.id === t.club_id) ?? clubs[0]
              if (!club) return null
              return (
                <article key={i} className="group flex flex-col justify-between gap-4 rounded-sm border border-slate-800/60 bg-slate-900/50 p-5 transition hover:border-accent-muted/50">
                  <div className="flex items-center gap-3">
                    <ClubCrest club={club} size={36} />
                    <div>
                      <div className="text-sm text-white">@{t.user}</div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-slate-500">{club.name ?? ''}</div>
                    </div>
                  </div>
                  <p className="font-display text-xl font-normal leading-snug text-white">&ldquo;{t.body}&rdquo;</p>
                  <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 font-mono text-[11px] uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-1.5"><span className="text-accent-muted">▲</span> {t.up}</span>
                    <span>🔥 · 😂 · 💀</span>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}

function WaitlistSection({ clubs }: { clubs: Club[] }) {
  const [club, setClub] = useState<string>('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const chosen = useMemo(() => clubs.find((c) => c.id === club), [clubs, club])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setEmailError(null)

    if (!club) {
      alert('Please pick your home locker room club before locking in!')
      return
    }

    if (!username.trim()) {
      alert('Please enter a username handle!')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Enter a valid email address')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase
      .from('waitlist')
      .insert([
        {
          email,
          username,
          selected_club: club,
        },
      ])

    setLoading(false)

    if (insertError) {
      console.error('WAITLIST_INSERT_ERROR:', insertError)
      setError(insertError.message)
      return
    }

    setSubmitted(true)
  }

  return (
    <section id="waitlist" className="relative overflow-hidden border-b border-slate-800/60 bg-black py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-accent-muted">// Founding members</div>
          <h2 className="mt-4 font-display text-5xl text-white sm:text-7xl leading-[0.9]">
            Claim your
            <br />
            locker. Early.
          </h2>
          <p className="mt-6 max-w-md text-slate-400 leading-relaxed">
            We&apos;re seeding all 20 rooms with founding members before public launch. Pick your home club.
            First in gets the first OG badge, a permanent founder flair, and the loudest mic on day one.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-slate-400">
            {['Founder badge — permanent', 'First raid rights at launch', 'Direct line to the build team'].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <span className="font-display text-accent-muted">✕</span> {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-sm border border-slate-800/60 bg-slate-900/60 p-6 sm:p-8">
          {submitted && chosen ? (
            <div className="flex h-full flex-col items-start justify-center gap-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent-muted">Confirmed</div>
              <ClubCrest club={chosen} size={72} />
              <h3 className="font-display text-4xl text-white leading-tight">
                You&apos;re in the {chosen.name} room.
              </h3>
              <p className="text-sm text-slate-400">
                We&apos;ll hit <span className="text-white">{email}</span> the moment the room opens. Sharpen your takes.
              </p>
              <button
                onClick={() => { setSubmitted(false); setEmail(''); setClub('') }}
                className="mt-2 text-xs font-mono uppercase tracking-widest text-slate-500 hover:text-white transition"
              >
                ← Add another email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="space-y-6">
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  01 · Your home club
                </label>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {clubs.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setClub(c.id)}
                      className={`flex flex-col items-center gap-1 rounded-sm border p-2 transition ${
                        club === c.id ? 'border-accent-muted bg-accent-muted/10' : 'border-slate-800/60 hover:border-slate-500'
                      }`}
                      aria-pressed={club === c.id}
                    >
                      <ClubCrest club={c} size={32} />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-slate-500">{c.abbr}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="username" className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  02 · Your username
                </label>
                <div className="relative mt-3">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500">
                    @
                  </span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="kojo_gunner"
                    className="w-full rounded-sm border border-slate-800/60 bg-black px-4 py-3 pl-8 text-sm text-white placeholder:text-slate-600 focus:border-accent-muted focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  03 · Your email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError(null)
                  }}
                  placeholder="you@matchday.com"
                  className={`mt-3 w-full rounded-sm border bg-black px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition ${
                    emailError
                      ? 'border-red-500/50 bg-red-950/10'
                      : 'border-slate-800/60 focus:border-accent-muted'
                  }`}
                />
              </div>

              {emailError && (
                <div className="mt-2 text-xs text-red-400 flex items-center gap-1.5 animate-fade-in">
                  <span>⚠️</span>
                  <span>{emailError}</span>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 font-mono">{error}</p>
              )}

              <button
                type="submit"
                disabled={!username || !email || loading}
                className="group flex w-full items-center justify-between rounded-sm bg-accent-muted px-5 py-4 text-sm font-bold uppercase tracking-widest text-white transition hover:bg-accent-muted disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
              >
                <span>{loading ? 'Submitting...' : 'Lock in my room'}</span>
                <span aria-hidden className="transition group-hover:translate-x-1">→</span>
              </button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
                No spam. No nonsense. Just the door codes when we open the room.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-800/60 bg-black py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl tracking-wide text-white">FUT</span>
            <span className="font-display text-2xl tracking-wide text-accent-muted">FI8</span>
          </div>
          <p className="mt-2 max-w-sm text-xs text-slate-600">
            Built in Lagos, for the loudest fans on the internet. Not affiliated with the Premier League or any club.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-slate-600">
          <a href="#raid" className="hover:text-white transition">The Raid</a>
          <a href="#rooms" className="hover:text-white transition">Rooms</a>
          <a href="#cred" className="hover:text-white transition">Fan Cred</a>
          <a href="#hot" className="hover:text-white transition">Hot Takes</a>
          <a href="#waitlist" className="hover:text-white transition">Waitlist</a>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-slate-600">
          © 2026 Futfi8 · Fut + Fi8 + #8
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  useEffect(() => {
    supabase
      .from('clubs')
      .select('id, name, short_name, primary_color, secondary_color, crest_url')
      .then(({ data }) => {
        if (data) {
          setClubs(data.map((c) => ({
            id: c.id,
            name: c.name,
            abbr: c.short_name,
            primary: c.primary_color,
            secondary: c.secondary_color,
            crest_url: c.crest_url,
          })))
        }
      })
  }, [])

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main>
        <Hero clubs={clubs} />
        <RaidSection />
        <RoomsSection clubs={clubs} />
        <FanCredSection />
        <HotTakeSection clubs={clubs} />
        <WaitlistSection clubs={clubs} />
      </main>
      <Footer />
    </div>
  )
}