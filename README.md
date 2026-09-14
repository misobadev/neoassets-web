# NeoAssets Web

> **Frontend of the NeoAssets scraping system.** This is the web app where all
> users will be able to register and contribute the content that is still
> missing (art packs and metadata). It talks to `neoassets-service` (the
> Go API in the sibling repo) and reads uploaded images from Cloudflare R2.

React + Vite single-page app for building and managing NeoAssets system art
packs. It talks to `neoassets-service` (the Go API in the sibling repo)
and stores uploaded images in Cloudflare R2.

## Scripts

```bash
npm ci
npm run dev        # local dev server
npm run build      # typecheck (tsc) + production build to dist/
npm run typecheck  # tsc -b --noEmit
```

## Environment (Vite)

| var                   | default                                        | purpose                     |
|-----------------------|------------------------------------------------|-----------------------------|
| `VITE_ASSETS_API_URL` | `https://neoassets.dev`                        | base URL of the Go API      |
| `VITE_CDN_BASE`       | `https://cdn.neoassets.dev`                    | R2 public custom domain     |

`VITE_CDN_BASE` is used to build the public URL of every uploaded object:
`<CDN_BASE>/<object_key>`. The custom domain is public; objects are not signed.

## Routes

| path                         | view                              |
|------------------------------|-----------------------------------|
| `/`                          | LandingPage (approved packs)      |
| `/app`                       | AppPage shell (auth required)     |
| `/app/submissions`           | SubmissionsView (list of cards)   |
| `/app/submissions/new`       | SubmissionEditor (new)            |
| `/app/submissions/:id`       | SubmissionEditor (edit)           |
| `/app/admin`                 | AdminView (admin only)            |
| `/app/docs`                  | ApiDocsPage (scraping API docs)   |
| `/app/developer`             | DeveloperPage (apps + API keys)   |

## Submission lifecycle

A pack is created as a **draft** and kept editable while its status is
`created`. Sending it for review moves it to `pending`. An admin then approves
it (`approved`) or rejects it (`rejected`). The editor is read-only unless the
status is `created`. Drafts are created lazily on first upload/save so the API
has a submission id to attach files to.

## Docker

The `docker-compose.yml` builds the app with the two Vite env vars passed as
build args. nginx serves the built `dist/`.
