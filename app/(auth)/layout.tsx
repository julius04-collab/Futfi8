export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-full flex-1 items-center justify-center px-4 py-12"
      style={{ background: 'var(--futfi8-color-background-base)' }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
