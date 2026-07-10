'use client'

import { useState, useRef, useEffect } from 'react'

const EMOJI_CATEGORIES = [
  {
    name: 'Football',
    emojis: ['⚽', '🏟️', '🏆', '🥅', '🧤', '👟', '🦁', '⭐', '🎯', '💪'],
  },
  {
    name: 'Reactions',
    emojis: ['🔥', '😂', '💀', '😤', '🤡', '😭', '🤫', '👀', '🫡', '🤝'],
  },
  {
    name: 'Vibes',
    emojis: ['❤️', '💜', '🔴', '🔵', '🟡', '⚪', '🟢', '⚫', '🫶', '🙌'],
  },
  {
    name: 'Hype',
    emojis: ['🚀', '💥', '⚡', '🎉', '👑', '💯', '🐐', '🧊', '🪄', '🎖️'],
  },
]

type EmojiPickerProps = {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
}

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-[280px] bg-[#12141c] border border-[#1e2230] rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      {/* Category Tabs */}
      <div className="flex border-b border-[#1e2230] px-1 py-1.5 gap-0.5">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(i)}
            className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition duration-100 ${
              activeCategory === i
                ? 'bg-[#a855f7]/15 text-[#a855f7]'
                : 'text-gray-500 hover:text-gray-300 hover:bg-zinc-900/40'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="grid grid-cols-5 gap-0.5 p-2">
        {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onEmojiSelect(emoji)}
            className="w-full aspect-square flex items-center justify-center text-xl rounded-lg hover:bg-zinc-800/60 hover:scale-110 active:scale-95 transition duration-100 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}
