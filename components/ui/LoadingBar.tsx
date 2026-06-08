export function LoadingBar() {
  return (
    <div
      className="mx-auto h-1 w-32 overflow-hidden rounded-full"
      style={{ background: 'var(--futfi8-color-background-input)' }}
    >
      <div
        className="h-full w-1/3 animate-pulse rounded-full"
        style={{ background: 'var(--futfi8-color-brand-electric-purple)' }}
      />
    </div>
  )
}
