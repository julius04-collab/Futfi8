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
    <div className="flex gap-3 p-4 border-b border-slate-800/60">
      <Avatar src={avatarUrl} name={username} size={36} />
      <div className="flex-1 min-w-0">
        <textarea
          ref={textareaRef}
          placeholder="Drop a hot take..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_POST_LENGTH}
          className="w-full bg-transparent border-none text-sm leading-relaxed outline-none resize-none text-white placeholder-slate-500"
        />
        <div className="mt-2 flex items-center justify-between">
          <span
            className={`text-xs ${isOverLimit ? 'text-red-400' : 'text-slate-500'}`}
          >
            {charsLeft}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || posting || isOverLimit}
            className={`
              rounded-full font-bold px-4 py-1.5 text-sm transition-all
              ${content.trim() && !posting && !isOverLimit
                ? 'bg-accent text-background cursor-pointer opacity-100'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}
              ${posting ? 'opacity-60' : ''}
            `}
          >
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
