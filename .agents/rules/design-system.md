# Design System

## Visual Language
- Dark-first: base `#0D0D0F`, surface `#1A1A2E`, electric purple accent `#9B6EFF`
- All colors defined as CSS custom properties in `TOKENS/variables.css`
- Use tokens exclusively — never hardcode color values in components

## Component Patterns
- All UI primitives in `components/ui/` — Button, Card, Input, Badge, Avatar, LoadingBar
- Feature components in `components/<feature>/` — locker-room, raid, match-thread, hot-takes
- Components accept className prop for override, but prefer composition

## Typography
- Display font (headings): var(--futfi8-typography-font-family-display)
- Body font: var(--futfi8-typography-font-family-body)
- Label font (badges, tabs): var(--futfi8-typography-font-family-label)
- Font sizes use token scale, not arbitrary values

## Tailwind
- Tailwind v4 with utility classes for layout/spacing
- Use Tailwind for gap, padding, flex layout; tokens for colors/typography
- Avoid custom CSS modules — prefer inline styles with tokens or Tailwind
