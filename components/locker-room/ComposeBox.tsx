'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { MAX_POST_LENGTH } from '@/lib/constants'

type ComposeBoxProps = {
  username: string
  avatarUrl?: string | null
  onPost: (content: string) => Promise<void>
}

export function ComposeBox({ username, avatarUrl, onPost }: ComposeBoxProps) {
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  async function handleSubmit() {
    const trimmed = content.trim()
    if (!trimmed || posting) return
    setPosting(true)
    try {
      await onPost(trimmed)
      setContent('')
    } finally {
      setPosting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const charsLeft = MAX_POST_LENGTH - content.length
  const isOverLimit = charsLeft < 0

  return (
    <div
      className="flex gap-3 px-4 py-3"
      style={{
        borderBottom: '1px solid var(--futfi8-color-border-default)',
        background: 'var(--futfi8-color-background-surface)',
      }}
    >
      <Avatar src={avatarUrl} name={username} size={36} />
      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          placeholder="What's your take?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_POST_LENGTH}
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
                ? 'var(--futfi8-color-ui-cta-primary)'
                : 'var(--futfi8-color-background-input)',
              color: content.trim() && !posting && !isOverLimit
                ? 'var(--futfi8-color-ui-cta-text)'
                : 'var(--futfi8-color-text-muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: content.trim() && !posting && !isOverLimit ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              opacity: posting ? 0.6 : 1,
            }}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
