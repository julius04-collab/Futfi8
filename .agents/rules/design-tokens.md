---
trigger: always_on
---

# Futfi8 Design Tokens & Theme Rules

## Overview
Futfi8 is dark-first, aggressive, and electric. The visual language is built around three truths: football is tribal, banter is loud, and this product lives on your phone at midnight after a match. Every design decision flows from that.

**Mood:** Dark & aggressive — black base, electric purple accent, high contrast.
**Not:** Polished sports media. Not ESPN. Not a scores app. A community product built for fans who have opinions.

---

## Color Tokens
Always reference color by token name — never hardcode hex values in components. Token names map directly to Tailwind custom classes defined in `tailwind.config.ts`.

### Brand Palette
| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `pitch-black` | `#0D0D0F` | `bg-pitch` | App base — deepest layer, main screen backgrounds |
| `electric-purple` | `#9B6EFF` | `bg-purple-electric` | Primary accent — active states, CTAs, raid indicators |
| `deep-purple` | `#6B3FCC` | `bg-purple-deep` | Pressed/hover state for electric purple |
| `midnight` | `#1A1A2E` | `bg-midnight` | Cards, panels, locker room surfaces |
| `muted-steel` | `#3D3D4E` | `bg-steel` | Input backgrounds, disabled states, dividers |
| `pure-white` | `#FFFFFF` | `text-white` | Primary text on dark backgrounds |

### Text Colors
| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `text-primary` | `#FFFFFF` | `text-white` | Headlines, display text, primary UI labels |
| `text-secondary` | `#CCCCCC` | `text-secondary` | Body copy, descriptions, secondary labels |
| `text-muted` | `#888888` | `text-muted` | Timestamps, placeholders, tertiary info |
| `text-accent` | `#9B6EFF` | `text-purple` | Links, active labels, raid countdowns |
| `text-inverse` | `#0D0D0F` | `text-inverse` | Text on light/purple backgrounds |

### Background Colors
| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `bg-base` | `#0D0D0F` | `bg-pitch` | App base layer |
| `bg-surface` | `#1A1A2E` | `bg-midnight` | Cards, locker room panels, modals |
| `bg-elevated` | `#1E1E32` | `bg-elevated` | Floating elements, dropdowns, bottom sheets |
| `bg-input` | `#3D3D4E` | `bg-steel` | Text input fields, search bars |
| `bg-raid-active` | `#1E1040` | `bg-raid` | Background tint when raid window is open |
| `bg-raid-highlight` | `#2A1A5E` | `bg-raid-highlight` | Highlighted raid posts inside locker room |

### State Colors
| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `state-raid` | `#9B6EFF` | `text-purple` | Raid window active — timers, banners, CTAs |
| `state-win` | `#4CAF82` | `text-win` | Match won — positive result |
| `state-loss` | `#FF6B6B` | `text-loss` | Match lost — locker room under raid |
| `state-draw` | `#888888` | `text-muted` | Draw — no raid triggered |
| `state-live` | `#FF4444` | `text-live` | Match is live — pulse indicator |

### Border Colors
| Token | Hex | Usage |
|---|---|---|
| `border-default` | `#222228` | Default card and panel borders |
| `border-subtle` | `#2A2A3A` | Inner dividers, list separators |
| `border-accent` | `#9B6EFF` | Active/focused — selected club, active tab |
| `border-raid` | `#3A2A7A` | Border on raid post cards |

---

## Typography & Scale

### Font Families
- **Display (`font-display`):** Headlines, locker room names, raid announcements, scorelines. Heavy, aggressive, tight tracking.
- **Body (`font-body`):** Posts, takes, comments, descriptions. Clean, readable on dark backgrounds.
- **Label (`font-label`):** Raid countdowns, system states, timestamps, match stats. Technical, precise, monospaced.

### Type Scale
| Role | Size | Weight | Font | Line Height | Letter Spacing | Tailwind |
|---|---|---|---|---|---|---|
| Display Hero | 48px | 800 | display | 1.1 | -0.03em | `text-5xl font-display font-extrabold tracking-tighter` |
| Display LG | 36px | 700 | display | 1.1 | -0.03em | `text-4xl font-display font-bold tracking-tighter` |
| Display MD | 28px | 700 | display | 1.3 | -0.03em | `text-3xl font-display font-bold tracking-tight` |
| Heading LG | 22px | 600 | body | 1.3 | 0 | `text-2xl font-body font-semibold` |
| Heading MD | 18px | 600 | body | 1.3 | 0 | `text-lg font-body font-semibold` |
| Body LG | 16px | 400 | body | 1.65 | 0 | `text-base font-body` |
| Body SM | 14px | 400 | body | 1.65 | 0 | `text-sm font-body` |
| Label LG | 12px | 500 | label | 1.5 | 0.12em | `text-xs font-label font-medium uppercase tracking-widest` |
| Label SM | 11px | 500 | label | 1.5 | 0.08em | `text-[11px] font-label font-medium uppercase tracking-wider` |
| Badge | 11px | 500 | body | 1.5 | 0.05em | `text-[11px] font-body font-medium uppercase tracking-wide` |

---

## Motion & Transitions

### Duration Tokens
| Token | Value | Usage |
|---|---|---|
| `duration-instant` | 80ms | Button press feedback |
| `duration-fast` | 150ms | Hover states, badge swaps |
| `duration-base` | 250ms | Most UI transitions |
| `duration-slow` | 400ms | Screen transitions, modals |
| `duration-raid` | 600ms | Raid banner entrance — punchy |

### Easing Tokens
| Token | Value | Usage |
|---|---|---|
| `ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard ease in-out |
| `ease-enter` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Raid banner, celebrations |

---

## Voice & Copy Rules
These apply to all UI copy — buttons, toasts, empty states, system messages.

| Rule | Wrong | Right |
|---|---|---|
| Short and loud | "A raid has been initiated in this locker room." | "You've been raided." |
| Fan-first language | "Your space received visitor content." | "Arsenal are in your locker room." |
| No corporate warmth | "Welcome back! We missed you." | Nothing. The feed is enough. |
| Tribal identity | "User posted in your community." | "An Arsenal fan just dropped a take." |
| Urgency without panic | "Please act soon." | "1 hour left to raid." |

**Tone:** Confident. Direct. Never condescending. Never corporate. Speaks like a fan in a group chat, not a brand manager.