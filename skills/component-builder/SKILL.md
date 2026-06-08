# Component Builder Skill

## When to Use
Building a new UI component (feature or shared).

## Workflow
1. Check `components/ui/` for existing primitives — reuse Button, Card, Input, Badge, Avatar
2. Check design system tokens in `TOKENS/variables.css` — use token references, never hardcode values
3. Create component in appropriate `components/<feature>/` directory
4. Export from `index.ts` barrel file
5. Use 'use client' directive only if browser APIs or hooks needed

## Conventions
- Named exports only
- Type props with `type` keyword
- Use `className` merge pattern for style overrides
- Test on 390px viewport
