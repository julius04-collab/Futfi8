---
trigger: always_on
---

# Futfi8 Data Privacy, Infrastructure Security, & Compliance Rules

## Privacy Framework Compliance

### NDPR Parameters (Primary African Target Market) & GDPR Rules
- **Anonymization Routine:** On complete profile erasure requests (`DELETE /api/users/me`), set `posts.author_id = null` and clear identifying textual titles to `[deleted]`. Fully clear the matching row from `public.users` and scrub related active storage records within a hard 30-day boundary loop.
- **Data Collection Constraints Matrix:**
  - *Permitted Fields:* Account Handle, Email Profile, Profile Asset URL string links, Birth Year (exclusively to process the age gate filter).
  - *Strictly Disallowed Fields:* Real Names, Mobile Contact Numbers, Exact Birth Coordinates, Financial accounts, or Behavioral tracker tags.

---

## Technical Grids & Input Security

### Hard Content Truncation Limits
- Max Post Length: `500 characters`
- Max Username Length: `20 characters` | Min Length: `3 characters`
- Username Regex Structural Restrictions: `/^[a-zA-Z0-9_]+$/`

### Cross-Site Scripting (XSS) Mitigation Systems
- **Plain Text Processing:** All user-generated descriptions parse down to raw string outputs within JSX blocks. 
- **Banned Functions:** The execution code property `dangerouslySetInnerHTML` is strictly disallowed inside front-end component files.
- **Image Boundaries:** Render profile icons via `next/image` structures to avoid raw vector injections. External user URL link text parsing is completely turned off for v1.

---

## Infrastructure & Transport Configuration

### Global Security Response Header Arrays
Inject these parameters directly into the configuration array layout block inside `next.config.ts`:
```ts
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
Relational Storage Encryption (Supabase Core)RLS Enforcement: Row Level Security constraints remain persistently active across all schemas.Key Isolation Guard: The highly privileged SUPABASE_SERVICE_ROLE_KEY is completely locked inside server-side environments. If this variable pattern leaks into standard user client component bundles, force an emergency systems token rotation sequence.Operational Human Verification LayoutSQLcreate table public.moderation_queue (
  id          uuid default gen_random_uuid() primary key,
  content     text not null,
  author_id   uuid references public.users(id) on delete set null,
  post_id     uuid references public.posts(id) on delete set null,
  scores      jsonb,
  reason      text not null,
  status      text default 'pending', -- pending | reviewed | actioned | dismissed
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  created_at  timestamptz default now()
);
Raid Prioritization Routing: When items enter this system with an internal property marker specifying is_raid_post = true, sort them directly to the peak of manual monitoring views to preserve stability across competing team rooms.Production Architecture Sign-Off Verification (OWASP Matrix)Vulnerability MetricTechnical Implementation PatternAccess Integrity FailuresStrict structural constraints processing auth.uid() filtering hooks applied across all Select/Update parameters.SQL Data Injection VectorsStandardized parameterization layers natively applied inside the parameters formatting rules of the Supabase Client.Component Chain ExploitationsMandatory structural invocation steps calling npm audit inside automated production compilation routines.Session Control FailuresProcessing token parameters entirely using encrypted server-validated httpOnly secure cookies.