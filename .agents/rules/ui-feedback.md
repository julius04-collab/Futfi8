---
trigger: always_on
---

# Futfi8 UI Loading, Error Boundaries, & Empty States

## Overview
Futfi8 is a real-time, matchday-critical product. When components fail during an active raid window or live match timeline, an explicit interface fallback pattern is required to maintain user engagement. Every single asynchronous operation must implement a loading state, an error state, and an empty state.

The golden rule: **never let the UI go blank or freeze without explanation.**

---

## Core Asynchronous Destructuring Pattern
Every client component execution block mapping server transactions must cleanly separate data arrays from loading markers and network errors.

```tsx
const { data, isLoading, error } = useSomething()

if (isLoading) return <PostFeedSkeleton count="{5}"/>
if (error) return <ErrorState message="{error.message}"/>
if (!data || data.length === 0) return <EmptyState description="Be the first..." title="No takes yet"/>

return <ActualContent data="{data}"/>
Constraint: Never return null silently. Never leave an active loading indicator active indefinitely without an automated timeout execution callback loop.Error Boundary Fail-SafesWrap major interface grid sectors in localized Error Boundary containers to encapsulate runtime crashes.TypeScript// components/ui/ErrorBoundary.tsx
'use client'
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props); this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary Captured]', error, info.componentStack)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <p className="text-lg font-body font-semibold text-white mb-2">Something went wrong</p>
          <p className="text-sm font-body text-muted mb-4">Refresh the page or try again in a moment.</p>
          <button onClick={() => this.setState({ hasError: false })} className="text-purple-electric text-sm underline font-body">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
Structural Skeleton SystemsUtilize custom animate-pulse placeholders matching theme panels (bg-midnight). Spinners are strictly limited to active loading buttons.TypeScript// components/ui/skeletons/PostSkeleton.tsx
export function PostSkeleton() {
  return (
    <div className="bg-midnight border border-border-default rounded-xl p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-steel" />
        <div className="h-3 bg-steel rounded w-24" />
        <div className="h-3 bg-steel rounded w-16 ml-auto" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-steel rounded w-full" />
        <div className="h-3 bg-steel rounded w-4/5" />
      </div>
    </div>
  )
}
Contextual Empty State MatricesTypeScript// components/ui/EmptyState.tsx
export function EmptyState({ title, description, action }: { title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-xl font-body font-semibold text-white mb-2">{title}</p>
      <p className="text-sm font-body text-muted mb-6 max-w-xs">{description}</p>
      {action && (
        <button onClick={action.onClick} className="text-purple-electric text-sm underline font-body">
          {action.label}
        </button>
      )}
    </div>
  )
}
ContextFallback Header TitleDescription Paragraph CopyLocker Room FeedNo takes yet.Be the first to drop a take in this locker room.Match Live ThreadThread is warming up.Drop the first take before kick-off.Historic Raid LogsNo raids yet.Win a match to raid a rival locker room.Global Hot TakesNothing yet today.Be the first to drop a hot take.Alert Notification BellAll clear.You're up to date.Real-Time Toast Alert Library (react-hot-toast)Transient interface elements default to standard var(--font-body) profiles mapped against exact hex definitions.showSuccessToast(message): Background: #1A1A2E | Border: 0.5px solid #222228 | Accent Theme: #9B6EFF | Duration: 3000msshowErrorToast(message): Background: #1A1A2E | Border: 0.5px solid #3a1a1a | Accent Theme: #FF6B6B | Duration: 4000msshowRaidToast(message): Background: #1E1040 | Border: 0.5px solid #3A2A7A | Accent Theme: ⚔️ | Duration: 6000ms