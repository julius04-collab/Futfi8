export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1">
      <div className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center bg-[url('/Images/hero-tunnel.jpg')]">
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="font-display text-4xl text-white leading-tight">
            The football.
            <br />
            <span className="text-accent-muted">The fight.</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-400 leading-relaxed">
            Premier League fan community. Locker rooms, raids, and reputation.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
