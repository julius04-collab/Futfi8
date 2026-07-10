export default function LockerRoomRedirectLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 animate-pulse">
      <div className="h-10 w-48 rounded bg-zinc-800" />
      <div className="flex gap-2">
        <div className="h-8 w-16 rounded-full bg-zinc-800" />
        <div className="h-8 w-24 rounded-full bg-zinc-800" />
        <div className="h-8 w-20 rounded-full bg-zinc-800" />
        <div className="h-8 w-16 rounded-full bg-zinc-800" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="h-24 rounded-lg bg-zinc-800" />
        <div className="h-24 rounded-lg bg-zinc-800" />
        <div className="h-24 rounded-lg bg-zinc-800" />
      </div>
    </div>
  )
}
