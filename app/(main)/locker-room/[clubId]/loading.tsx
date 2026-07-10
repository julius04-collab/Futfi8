export default function LockerRoomLoading() {
  return (
    <div className="flex flex-1 w-full animate-pulse" style={{ background: '#0D0D0F' }}>
      {/* Left Sidebar Skeleton */}
      <aside className="hidden md:flex w-[72px] lg:w-[240px] h-screen sticky top-0 flex-col justify-between border-r border-[#1e2230] px-2 lg:px-4 py-6 z-10 flex-shrink-0" style={{ background: '#0D0D0F' }}>
        <div className="space-y-6 w-full">
          <div className="px-3 flex items-center gap-2 justify-center lg:justify-start">
            <div className="h-8 w-20 rounded bg-[#3D3D4E] hidden lg:block" />
            <div className="h-8 w-10 rounded bg-[#3D3D4E] lg:hidden" />
          </div>
          <nav className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-full flex items-center justify-center lg:justify-start gap-4 px-3 py-3">
                <div className="h-6 w-6 rounded-full bg-[#3D3D4E] shrink-0" />
                <div className="h-4 w-20 rounded bg-[#3D3D4E] hidden lg:block" />
              </div>
            ))}
          </nav>
          <div className="w-full px-3">
            <div className="h-10 w-full rounded-full bg-[#3D3D4E]" />
          </div>
        </div>
        <div className="w-full px-3">
          <div className="flex items-center gap-3 justify-center lg:justify-start">
            <div className="h-10 w-10 rounded-full bg-[#3D3D4E] shrink-0" />
            <div className="space-y-1.5 hidden lg:block">
              <div className="h-3 w-20 rounded bg-[#3D3D4E]" />
              <div className="h-2 w-14 rounded bg-[#3D3D4E]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-full max-w-[780px]">
        {/* Club Header Skeleton */}
        <div className="px-4 py-6 bg-zinc-900">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[#3D3D4E] shrink-0" />
            <div className="space-y-2">
              <div className="h-6 w-48 rounded bg-[#3D3D4E]" />
              <div className="h-3 w-24 rounded bg-[#3D3D4E]" />
            </div>
          </div>
        </div>

        {/* Tab Bar Skeleton */}
        <div className="flex border-b border-[#1e2230]">
          {['Feed', 'Raid History', 'Members', 'Fixtures'].map((tab) => (
            <div key={tab} className="flex-1 h-[42px] bg-[#3D3D4E]/40 mx-1 my-1 rounded" />
          ))}
        </div>

        {/* Compose Box Skeleton */}
        <div className="border-b border-[#1e2230] p-4" style={{ background: '#0D0D0F' }}>
          <div className="rounded-xl border border-[#1e2230] p-4 space-y-3" style={{ background: '#12141c' }}>
            <div className="h-3 w-32 rounded bg-[#3D3D4E]" />
            <div className="h-12 w-full rounded bg-[#3D3D4E]" />
            <div className="flex items-center justify-between">
              <div className="h-4 w-12 rounded bg-[#3D3D4E]" />
              <div className="h-8 w-20 rounded bg-[#3D3D4E]" />
            </div>
          </div>
        </div>

        {/* Post Card Skeletons — 3 items */}
        <div className="divide-y divide-[#1e2230]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-[#3D3D4E]" />
                <div className="h-4 w-32 rounded bg-[#3D3D4E]" />
              </div>
              <div className="h-4 w-full rounded bg-[#3D3D4E]" />
              <div className="h-4 w-3/4 rounded bg-[#3D3D4E]" />
              <div className="flex gap-4">
                <div className="h-4 w-16 rounded bg-[#3D3D4E]" />
                <div className="h-4 w-16 rounded bg-[#3D3D4E]" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel Skeleton — 320px, hidden on mobile */}
      <aside className="w-[320px] h-screen sticky top-0 hidden lg:flex flex-col gap-4 px-4 py-6 overflow-y-auto scrollbar-none z-10 flex-shrink-0 border-l border-[#1e2230]" style={{ background: '#0D0D0F' }}>
        <div className="border border-[#1e2230] rounded-2xl p-4 space-y-4" style={{ background: '#12141c' }}>
          <div className="h-4 w-36 rounded bg-[#3D3D4E]" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="pt-2 space-y-2">
              <div className="h-3 w-full rounded bg-[#3D3D4E]" />
              <div className="h-3 w-3/4 rounded bg-[#3D3D4E]" />
            </div>
          ))}
        </div>
        <div className="border border-[#1e2230] rounded-2xl p-4 space-y-3" style={{ background: '#12141c' }}>
          <div className="h-4 w-32 rounded bg-[#3D3D4E]" />
          <div className="h-3 w-full rounded bg-[#3D3D4E]" />
          <div className="h-3 w-2/3 rounded bg-[#3D3D4E]" />
        </div>
        <div className="border border-[#1e2230] rounded-2xl p-4 space-y-3" style={{ background: '#12141c' }}>
          <div className="h-4 w-28 rounded bg-[#3D3D4E]" />
          <div className="h-12 w-full rounded bg-[#3D3D4E]" />
        </div>
      </aside>
    </div>
  )
}
