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
  -> GET /api/v1/packs            approved packs (LandingPage)
  -> GET /api/v1/systems          system catalog (upload grid)
  -> GET /auth/submissions        current user's submissions + files + logs
  -> GET /auth/submissions/:id    a submission detail
  -> POST /submissions            create a draft
  -> PUT  /submissions/:id        save a draft
  -> POST /submissions/:id/upload presigned R2 URL
  -> PUT  <presigned R2 URL>      direct browser upload (XHR)
  -> POST /submissions/:id/submit draft -> pending
  -> POST /submissions/:id/trash  non-approved -> trashed (deletes files)
```

## Scraping API docs

The public scraping API (`/api/v1/scrape/*` in the Go service) is documented in
`src/pages/ApiDocsPage.tsx` and its canonical contract lives in the service repo
at `docs/openapi.yaml`. Developers create app credentials and personal API keys
in `src/pages/DeveloperPage.tsx`, which calls the user-JWT endpoints
`/api/v1/auth/developer/apps*` and `/api/v1/auth/api-keys*`.

## Key files

- `src/lib/api.ts`         `api()` fetch helper, types, `USER_TOKEN_KEY`,
                           `CDN_BASE`, `cdnUrl()`.
- `src/i18n/index.ts`      i18next setup, `LANGUAGES`, `setLanguage()`, persisted
                           in `localStorage` under `ns-language`.
- `src/i18n/locales/*.json` all UI strings (en, de, es, fr, id, it, ja, ko, pt, ru, zh).
- `src/components/LanguageSelect.tsx`  language dropdown in the sidebar footer.
- `src/lib/image.ts`       `toWebp()` in-browser conversion (png/jpg -> webp).
- `src/lib/upload.ts`      `uploadWithProgress()` PUT via XHR to the presigned URL.
- `src/pages/SubmissionsView.tsx`   list of submission cards (reads `/auth/submissions`).
- `src/components/SubmissionEditor.tsx`  new/edit form + uploads + save/submit.
- `src/pages/LandingPage.tsx`   approved community packs + contribution categories.
- `src/pages/AdminView.tsx`     admin review/approve/reject modal.
- `src/pages/ApiDocsPage.tsx`   public docs for the scraping API (route `/app/docs`).
- `src/pages/DeveloperPage.tsx` self-service developer apps + personal API keys
                                (route `/app/developer`, auth required).

Icons use `lucide-react` (imported per component, tree-shakeable). Do not hand-write
inline SVGs; pick an existing `lucide-react` icon instead.

## Behavior to preserve

- **Statuses**: `created` (editable draft), `pending` (in review),
  `approved` (published, shows in `/packs`), `rejected`, `trashed`. Editor is
  read-only unless status is `created`. A user can trash (`trashed`) a pack only
  while it is `created` or `rejected` (the trash button is hidden when pending
  review or approved). The API filters `trashed` out of the list and deletes its
  R2 files. Labels live under `status.*` in `src/i18n/locales/en.json` and are
  resolved with `t("status." + value)`.
- **Lazy creation**: for `/submissions/new` the submission is created on the
  first upload/save/submit via `ensureSubmission()`. It requires `name` and
  `author`; creation is memoized with a ref + promise so concurrent file adds
  reuse one id and never create duplicates.
- **Images in cards**: built with `cdnUrl(file.object_key)` from the `files`
  array. The edit grid shows `file.blob` immediately after upload and
  `file.objectKey` for existing files.
- **Draft persistence** is server-side now (created/pending), not localStorage.
- **i18n**: never hardcode UI text; add keys to `src/i18n/locales/en.json` and use
  `useTranslation()` + `t()`. Keep the same keys across every locale file and
  preserve `{{placeholders}}`. Status/role/log labels use `status.*`,
  `metadataStatus.*`, `role.*`, `log.*` (the latter two with `defaultValue`).

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
