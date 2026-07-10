export default function HotTakesLoading() {
  return (
    <div className="flex-1 flex max-w-full lg:max-w-[975px] justify-center mx-auto animate-pulse">
      <main className="flex-1 border-r border-[#1e2230] flex flex-col w-full max-w-full md:max-w-[600px] bg-[#0b0c10]">
        <div className="px-4 py-3.5 border-b border-[#1e2230] space-y-2">
          <div className="h-6 w-48 rounded bg-zinc-800" />
          <div className="h-3 w-36 rounded bg-zinc-800" />
        </div>
        <div className="border-b border-[#1e2230] p-4 flex gap-3 bg-[#0d0e12]">
          <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-12 w-full rounded-lg bg-zinc-800" />
            <div className="flex justify-between">
              <div className="h-6 w-24 rounded-full bg-zinc-800" />
              <div className="h-6 w-28 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-[#1e2230] flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-7 w-16 rounded-full bg-zinc-800" />
          ))}
        </div>
        <div className="divide-y divide-[#1e2230]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 rounded bg-zinc-800" />
                  <div className="h-3 w-16 rounded bg-zinc-800" />
                </div>
                <div className="h-4 w-full rounded bg-zinc-800" />
                <div className="h-4 w-3/4 rounded bg-zinc-800" />
                <div className="flex gap-8 mt-4">
                  <div className="h-4 w-12 rounded bg-zinc-800" />
                  <div className="h-4 w-12 rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
