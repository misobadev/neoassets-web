# NeoAssets Web - Agent Context

**Frontend of the NeoAssets scraping system.** This is the web app where all
users will be able to register and contribute the content that is still missing
(art packs and metadata). It is a React SPA that talks to
`neoassets-service` (the Go API in the sibling repo) and reads uploaded
images from Cloudflare R2.

This file documents how the app works so future edits stay consistent. The DB is
the single source of truth; all pack metadata comes from the Go API, never from
a static file.

## Architecture

```
Browser (React SPA)
  -> GET  /api/v1/packs            approved packs (HomeView)
  -> GET  /api/v1/systems          system catalog (upload grid)
  -> GET  /auth/submissions        current user's submissions + files + logs
  -> GET  /auth/submissions/:id    a submission detail
  -> POST /submissions/upload-url  presigned R2 URL (no submission row yet)
  -> PUT  <presigned R2 URL>       direct browser upload (XHR)
  -> POST /submissions             create + submit a new pack (files included)
  -> POST /submissions/:id/files   register files on an existing draft/rejected
  -> PUT  /submissions/:id         edit a draft's metadata
  -> POST /submissions/:id/submit  draft -> pending
  -> POST /submissions/:id/trash   non-approved -> trashed (deletes files)
```

Drafts are **client-side** (IndexedDB, `src/lib/draft.ts`): no submission row
exists until the user submits for review. The R2 uploads for a new pack use the
`/submissions/upload-url` endpoint, which presigns keys from the pack name.

## Scraping API docs

The public scraping API (`/api/v1/scrape/*` in the Go service) is documented in
`src/pages/ApiDocsPage.tsx` and its canonical contract lives in the service repo
at `docs/openapi.yaml`. Developers create app credentials and personal API keys
in `src/pages/DeveloperPage.tsx`, which calls the user-JWT endpoints
`/api/v1/auth/developer/apps*` and `/api/v1/auth/api-keys*`.

## Key files

- `src/lib/api/` the API client, one module per domain, all re-exported by
  `index.ts` (import from `lib/api`):
    - `client.ts` `api()` fetch helper (`credentials: "include"`), `ApiError`,
      `cdnUrl()`, `mediaUrl()` (CDN URL plus a cache-busting version),
      `PagedList`.
    - `session.ts` `isAuthed()`, `clearStoredAuth()`, `userRole()`,
      `isAdmin()`, `isReviewer()`. Auth is an httpOnly session cookie set by
      the API, so no token is stored in JS: the cookie authenticates every
      request. Only the non-secret profile (`USER_ID/NAME/EMAIL/ROLE`) is
      cached in `localStorage` for the UI.
    - `account.ts`, `catalog.ts`, `submissions.ts` (art packs), `metadata.ts`,
      `reviews.ts`, `community.ts` (rewards, profiles, follows), `admin.ts`,
      `developer.ts`: types and calls for each area.
- `src/lib/format.ts` `formatDate()`, `formatBytes()`, `formatFileSize()`.
- `src/components/ui/` shared UI: `Modal` (every dialog overlay:
  `role="dialog"`, named by its first heading, focus trapped and restored,
  Escape/backdrop call `onClose`; omit `onClose` for a dialog that must not be
  dismissed), `DialogHeader` (icon + title + description), `StatusBadge`.
  New dialogs use these instead of a hand-written `fixed inset-0` overlay.
- `src/lib/status.ts` `statusBadge()`: the badge class for a submission or
  review status.
- `src/i18n/index.ts` i18next setup, `LANGUAGES`, `setLanguage()`, persisted
  in `localStorage` under `ns-language`. English is bundled; other languages
  are loaded on demand, and `main.tsx` renders after `i18nReady`.
- `src/routes.tsx` the route table. Pages are `lazy()` (AppPage shows a
  fallback while one loads). Account pages use `RequireAuth`; review/admin
  pages use `RequireRole` (`components/RequireAuth.tsx`).
- `src/lib/seo.ts` `usePageMeta()` (title, description, canonical = current
  path, Open Graph/Twitter tags, schema.org JSON-LD) and `useNoIndex()`.
  Every public page calls `usePageMeta`; `RequireAuth`, `RequireRole` and the
  auth page call `useNoIndex`. `public/robots.txt` disallows the same private
  paths; `public/og-image.png` is the default social card.
- `src/lib/session.ts` `useSession()` (signed-in user and role, re-renders on
  login, logout, a 401 or another tab), `useRoleRefresh()`, `signOut()`.
  Components read the session with `useSession()`; login and profile changes
  go through `storeCachedUser()`.
- `src/i18n/locales/*.json` all UI strings (en, de, es, fr, id, it, ja, ko, pt, ru, zh).
- `src/components/LanguageSelect.tsx` language dropdown in the sidebar footer.
- `src/lib/image.ts` `toSafeBackground()` for avatars (center-crops to a
  square WebP in the browser).
- `src/lib/upload.ts` `uploadWithProgress()` PUT via XHR to the presigned URL.
- `src/lib/draft.ts` client-side draft store (IndexedDB): `savePackDraft()`,
  `loadPackDraft()`, `clearPackDraft()`. Holds metadata +
  the actual image `File` blobs; a single DB connection is
  reused.
- `src/lib/media.ts` metadata media helpers: `MEDIA_KIND_LABEL`, accepted formats,
  `measureVideo()`, accepted aspect ratios and video
  limits. Submission images are uploaded as picked; the
  backend normalizes them to WebP (crop/scale/quality)
  on approval.
- `src/pages/NewGamePage.tsx` create a brand-new game (system + type + name with
  an existing-game search, all fields and media) as a
  `kind=new_game` metadata submission (route
  `/app/metadata[/:systemId]/new`).
- `src/pages/SubmissionsView.tsx` list of submission cards (reads `/auth/submissions`).
- `src/components/SubmissionEditor.tsx` new/edit form + uploads + save/submit.
- `src/pages/AdminView.tsx` admin review/approve/reject modal.
- `src/pages/ApiDocsPage.tsx` public docs for the scraping API (route `/app/docs`).
- `src/pages/DeveloperPage.tsx` self-service developer apps + personal API keys
  (route `/app/developer`, auth required).

Icons use `lucide-react` (imported per component, tree-shakeable). Do not hand-write
inline SVGs; pick an existing `lucide-react` icon instead.

## Behavior to preserve

- **Statuses**: `created` (editable draft), `pending` (in review),
  `approved` (published, shows in `/packs`), `rejected`, `trashed`. The editor is
  editable while the status is missing (new pack), `created` or `rejected`; it is
  read-only for `pending`, `approved` and `trashed`. A user can trash (`trashed`)
  a pack unless it is `approved` or already `trashed` (the trash button is hidden
  when approved). The API filters `trashed` out of the list and deletes its R2
  files. Labels live under `status.*` in `src/i18n/locales/en.json` and are
  resolved with `t("status." + value)`.
- **Client-side drafts**: a new pack has no submission row. Metadata + image
  blobs live in IndexedDB (`src/lib/draft.ts`), keyed by `pack-<id>` (editing an
  existing submission), `contribution-<folder>` (contributing to a published
  pack) or `current` (brand-new pack). Autosave is debounced and gated on the
  initial load (`hydrated`) so the empty mount state cannot overwrite a stored
  draft; it flushes on `pagehide`/`visibilitychange`/unmount. The row is only
  created on submit (`POST /submissions` with the uploaded files). "Save draft"
  on a new pack writes the IndexedDB draft; on an existing submission it also
  PUTs the metadata and uploads any new files.
- **Images in cards**: built with `cdnUrl(file.object_key)` from the `files`
  array. The edit grid shows `file.blob` immediately after upload and
  `file.objectKey` for existing files.
- **i18n**: never hardcode UI text; add keys to `src/i18n/locales/en.json` and use
  `useTranslation()` + `t()`. Keep the same keys across every locale file and
  preserve `{{placeholders}}`. Status/role/log labels use `status.*`,
  `metadataStatus.*`, `role.*`, `log.*` (the latter two with `defaultValue`).

## Development checks

```bash
npm run check   # typecheck + ESLint + Prettier check + Vitest
npm run format  # format with Prettier
```

CI (`.github/workflows/ci.yml`) runs the same checks and the build on every
push and pull request. User-supplied links (donation URLs, duplicate-game
links) go through `safeHttpUrl()` (`src/lib/url.ts`) before rendering.

## Known pitfalls / notes

- **R2 CORS**: presigned uploads go directly to `*.r2.cloudflarestorage.com`.
  If the bucket CORS policy is missing/wrong, the browser bumps the preflight
  `OPTIONS` and the upload fails with a CORS error. Fix it on the bucket, not in
  code. Allow `PUT` and `Access-Control-Request-Headers`.
- **Cached 404s**: Cloudflare caches the first 404 for an object (4h). If a new
  object was requested before it existed, the CDN serves the stale 404. Wait or
  purge/hard-refresh. This is why the list card may not show an image right
  after the first upload while the editor grid shows it (local blob).
- **Preview key** is always `packs/{pack_id}/preview.webp`. Backgrounds are
  `packs/{pack_id}/backgrounds/{system_id}.webp|gif`.
