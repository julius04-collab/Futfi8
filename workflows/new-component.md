# New Component Workflow

1. Check if component belongs in `components/ui/` (shared) or `components/<feature>/`
2. Read `TOKENS/variables.css` for design tokens
3. Look at existing similar components for pattern reference
4. Create component file + `index.ts` barrel export
5. Use 'use client' only if hooks or browser APIs needed
6. Test with `npm run build`
