'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { MAX_RAID_POST_LENGTH } from '@/lib/constants'

type RaidComposeBoxProps = {
  username: string
  avatarUrl?: string | null
  raidWindowId: string
  defendingLockerRoomId: string
  onRaidPosted: () => void
}

export function RaidComposeBox({ username, avatarUrl, raidWindowId, defendingLockerRoomId, onRaidPosted }: RaidComposeBoxProps) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || posting || submitted) return
    setPosting(true)
    setError(null)

    const res = await fetch(`/api/raids/${raidWindowId}/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: trimmed, locker_room_id: defendingLockerRoomId }),
    })

    if (!res.ok) {
      const err = await res.json()
      setError(err.error || 'Failed to post raid')
      setPosting(false)
      return
    }

    setSubmitted(true)
    setContent('')
    setPosting(false)
    onRaidPosted()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charsLeft = MAX_RAID_POST_LENGTH - content.length
  const isOverLimit = charsLeft < 0

  if (submitted) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          background: 'rgba(155,110,255,0.08)',
          borderBottom: '1px solid var(--futfi8-color-border-raid)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--futfi8-color-text-accent)' }}>
          Your raid post has been submitted.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex gap-3 px-4 py-3"
      style={{
        borderBottom: '1px solid var(--futfi8-color-border-raid)',
        background: 'rgba(155,110,255,0.04)',
      }}
    >
      <Avatar src={avatarUrl} name={username} size={36} />
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--futfi8-color-text-accent)' }}>
          Raid Post — one shot
        </p>
        <textarea
          ref={textareaRef}
          placeholder="Drop your raid take..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_RAID_POST_LENGTH}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            color: 'var(--futfi8-color-text-primary)',
            fontSize: '14px',
            lineHeight: 1.5,
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
          }}
        />
        {error && (
          <p className="mt-1 text-xs" style={{ color: 'var(--futfi8-color-state-loss)' }}>
            {error}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span
            className="text-xs"
            style={{
              color: isOverLimit
                ? 'var(--futfi8-color-state-loss)'
                : 'var(--futfi8-color-text-muted)',
            }}
          >
            {charsLeft}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || posting || isOverLimit}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: 'none',
              background: content.trim() && !posting && !isOverLimit
                ? 'var(--futfi8-color-state-raid-open)'
                : 'var(--futfi8-color-background-input)',
              color: content.trim() && !posting && !isOverLimit
                ? '#fff'
                : 'var(--futfi8-color-text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: content.trim() && !posting && !isOverLimit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              opacity: posting ? 0.6 : 1,
            }}
          >
            {posting ? 'Posting...' : 'Raid!'}
          </button>
        </div>
      </div>
    </div>
  )
}
