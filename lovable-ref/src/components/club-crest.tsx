import type { Club } from "@/lib/clubs";

export function ClubCrest({ club, size = 44 }: { club: Club; size?: number }) {
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
