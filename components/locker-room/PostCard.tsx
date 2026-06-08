'use client'

import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ReactionBar } from './ReactionBar'
import type { PostWithDetails } from './PostFeed'

type PostCardProps = {
  post: PostWithDetails
  currentUserId: string
  onReact: (postId: string, type: string) => Promise<void>
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function PostCard({ post, currentUserId, onReact }: PostCardProps) {
  const author = post.author as unknown as { id: string; username: string; avatar_url: string | null }

  return (
    <Card>
      <div className="flex gap-3">
        <Avatar
          src={author?.avatar_url}
          name={author?.username || 'Unknown'}
          size={36}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--futfi8-color-text-primary)' }}
            >
              {author?.username || 'Unknown'}
            </span>
            {post.type !== 'standard' && (
              <Badge
                variant={post.type === 'raid' ? 'raid' : post.type === 'hot_take' ? 'hot-take' : 'default'}
              >
                {post.type === 'match_thread' ? 'Match' : post.type.replace('_', ' ')}
              </Badge>
            )}
            <span
              className="ml-auto shrink-0 text-xs"
              style={{ color: 'var(--futfi8-color-text-muted)' }}
            >
              {formatTime(post.created_at)}
            </span>
          </div>
          <p
            className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: 'var(--futfi8-color-text-secondary)' }}
          >
            {post.content}
          </p>
          {post.match && (
            <div
              className="mt-2 rounded-md px-3 py-1.5 text-xs"
              style={{
                background: 'var(--futfi8-color-background-base)',
                border: '1px solid var(--futfi8-color-border-subtle)',
              }}
            >
              Match discussion
            </div>
          )}
          <div className="mt-2.5">
            <ReactionBar
              postId={post.id}
              initialReactions={post.reactions || []}
              currentUserId={currentUserId}
              onReact={onReact}
            />
          </div>
        </div>
      </div>
    </Card>
  )
}
