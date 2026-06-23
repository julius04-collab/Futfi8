import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth, signOut } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { CLUBS } from "@/lib/clubs";

export function SiteNav() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const club = profile ? CLUBS.find((c) => c.id === profile.club_id) : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-baseline gap-1.5">
          <span className="font-display text-2xl tracking-wide text-chalk">FUT</span>
          <span className="font-display text-2xl tracking-wide text-primary">FI8</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link to="/takes" className="hover:text-chalk transition">Hot Takes</Link>
          {profile ? (
            <Link
              to="/room/$clubId"
              params={{ clubId: profile.club_id }}
              className="hover:text-chalk transition"
            >
              My Room{club ? ` · ${club.short}` : ""}
            </Link>
          ) : null}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            {profile && (
              <span className="hidden font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:inline">
                @{profile.handle} · <span className="text-primary">{profile.cred}</span>
              </span>
            )}
            <button
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
              className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-chalk"
            >
              Sign out
            </button>
          </div>
        ) : (
          <Link
            to="/auth"
            className="inline-flex h-9 items-center gap-2 rounded-sm bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition hover:brightness-110"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
