'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { MAX_RAID_POST_LENGTH } from '@/lib/constants'
import { useCreatePost } from '@/hooks/use-create-post'

type RaidComposeBoxProps = {
  username: string
  avatarUrl?: string | null
  raidWindowId: string
  defendingLockerRoomId: string
  onRaidPosted: () => void
}

export function RaidComposeBox({ username, avatarUrl, raidWindowId, defendingLockerRoomId, onRaidPosted }: RaidComposeBoxProps) {
  const [content, setContent] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { createPost, isSubmitting, error } = useCreatePost()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting || submitted) return
    const result = await createPost({
      endpoint: `/api/raids/${raidWindowId}/post`,
      content: trimmed,
      locker_room_id: defendingLockerRoomId,
      type: 'raid',
      raid_window_id: raidWindowId,
    })
    if (!result.success) return
    setSubmitted(true)
    setContent('')
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
    <div className="flex gap-3 p-4 border-b border-slate-800/60">
      <Avatar src={avatarUrl} name={username} size={36} />
      <div className="flex-1 min-w-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-accent">
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
          className="w-full bg-transparent border-none text-sm leading-relaxed outline-none resize-none text-white placeholder-slate-500"
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}
          >
            {charsLeft}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting || isOverLimit}
            className={`
              rounded-full font-bold px-4 py-1.5 text-sm transition-all
              ${content.trim() && !isSubmitting && !isOverLimit
                ? 'bg-purple-600 text-white cursor-pointer opacity-100'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}
              ${isSubmitting ? 'opacity-60' : ''}
            `}
          >
            {isSubmitting ? 'Posting...' : 'Raid!'}
          </button>
        </div>
      </div>
    </div>
  )
}
