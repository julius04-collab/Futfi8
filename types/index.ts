export type Club = {
  id: string
  name: string
  short_name: string
  crest_url: string
  primary_color: string
  secondary_color: string
  league_id: string
  created_at: string
}

export type User = {
  id: string
  email: string
  username: string
  avatar_url: string | null
  home_club_id: string | null
  created_at: string
}

export type LockerRoom = {
  id: string
  club_id: string
  member_count: number
  created_at: string
}

export type Membership = {
  id: string
  user_id: string
  locker_room_id: string
  joined_at: string
  fan_cred_score: number
  badge_level: string
}

export type Post = {
  id: string
  author_id: string
  locker_room_id: string | null
  content: string
  type: 'standard' | 'raid' | 'match_thread' | 'hot_take'
  match_id: string | null
  created_at: string
  upvote_count: number
  is_raid_post: boolean
  raid_window_id: string | null
  archived: boolean
}

export type PostWithDetails = Post & {
  author: Pick<User, 'id' | 'username' | 'avatar_url'> | null
  match: Pick<Match, 'id' | 'home_club_id' | 'away_club_id' | 'home_score' | 'away_score' | 'status'> | null
  reactions: Pick<Reaction, 'type' | 'user_id'>[]
}

export type Match = {
  id: string
  home_club_id: string
  away_club_id: string
  kickoff_at: string
  status: 'scheduled' | 'live' | 'finished'
  home_score: number | null
  away_score: number | null
  api_match_id: number | null
}

export type RaidWindow = {
  id: string
  match_id: string
  raiding_club_id: string
  defending_club_id: string
  opens_at: string
  closes_at: string
  status: 'active' | 'closed'
}

export type MatchThread = {
  id: string
  match_id: string
  locker_room_id: string
  opens_at: string
  closes_at: string
  status: 'active' | 'closed'
}

export type Reaction = {
  id: string
  user_id: string
  post_id: string
  type: 'upvote' | 'fire' | 'laugh' | 'rage'
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: string
  reference_id: string
  read: boolean
  created_at: string
}
