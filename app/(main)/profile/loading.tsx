export default function ProfileLoading() {
  return (
    <div className="flex-1 flex flex-col w-full animate-pulse">
      <div
        className="flex items-center gap-3 border-b px-4 py-5"
        style={{ borderColor: 'var(--futfi8-color-border-default)' }}
      >
        <div className="h-[52px] w-[52px] rounded-full bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded bg-zinc-800" />
          <div className="h-3 w-44 rounded bg-zinc-800" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="rounded-xl border border-[#1e2230] bg-[#12141c] p-5 space-y-3">
          <div className="h-3 w-24 rounded bg-zinc-800" />
          <div className="h-8 w-20 rounded bg-zinc-800" />
        </div>
        <div className="rounded-xl border border-[#1e2230] bg-[#12141c] p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded bg-zinc-800" />
            <div className="h-4 w-48 rounded bg-zinc-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded bg-zinc-800" />
            <div className="h-4 w-32 rounded bg-zinc-800" />
          </div>
        </div>
        <div className="h-10 w-full rounded-lg bg-zinc-800" />
      </div>
    </div>
  )
}
