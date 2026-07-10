// Business-critical constants — always import from here, never hardcode inline

export const RAID_WINDOW_DURATION_MS = 2 * 60 * 60 * 1000 // 2 hours
export const MATCH_THREAD_PRE_OPEN_MINS = 30
export const MATCH_THREAD_POST_CLOSE_MINS = 120

export const FAN_CRED = {
  UPVOTE_RECEIVED: 2,
  RAID_WIN: 5,
  DEFENCE_WIN: 5,
  MATCHDAY_STREAK: 10,
  MODERATION_STRIKE: -10,
} as const

export const CLUB_SWITCH_COOLDOWN_DAYS = 30
export const AGE_GATE_RAID_MIN = 16
export const MAX_RAID_POST_LENGTH = 280
export const MAX_POST_LENGTH = 500

export const PREMIER_LEAGUE_ID = 39
export const PREMIER_LEAGUE_CODE = 'PL'
// Development season — change to 2025 on paid plan for 2025/26 data
export const PREMIER_LEAGUE_SEASON = 2024

// Toxicity thresholds for Hugging Face moderation (unitary/toxic-bert)
export const TOXICITY_THRESHOLD_STANDARD = 0.85
export const TOXICITY_THRESHOLD_RAID = 0.75

// UUID validation regex
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
