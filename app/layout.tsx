import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Futfi8 — The Football. The Fight.',
  description: 'Premier League fan community platform. Locker rooms, raids, and reputation.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
