# NeoAssets design system

NeoAssets is a catalog: people browse thousands of games, compare media and
ROM hashes, and review contributions. The interface should feel like a precise
tool with an arcade spirit: neutral dark chrome, one bright cyan for actions,
and a color per area of the catalog so the site reads at a glance. Box art,
logos and screenshots still bring most of the color.

All values live as CSS variables in `src/index.css` (`@theme` and
`html.light`). Pages use the variable names, the utility classes (`card`,
`btn-*`, `badge-*`, `input`) and the `tone-*` classes, never raw hex values.
The public brand kit lives at `/app/brand` and its files in `public/brand`.

## Brand

- **Isotype:** an isometric cube made of 2x2 asset tiles per face, with the
  top-right tile of the top face missing: the piece the community adds. Faces:
  top `#7ff0ff`, left `#14a8cc`, right `#e25bd0`. It is used in color
  (`components/Brand.tsx`, `public/neoassets-isotype.svg`) and reads down to
  16px; a white version exists for photos.
- **Wordmark:** "NEOASSETS" in Anta, uppercase, with "NEO" in the soft cyan
  (deep cyan on light backgrounds).
- Do not recolor, rotate or rearrange the cube, and do not add gradients,
  shadows or outlines to the mark.

## Color

| Token                        | Dark      | Light     | Role                                          |
| ---------------------------- | --------- | --------- | --------------------------------------------- |
| `--color-base-100`           | `#0b1016` | `#f4f6f9` | Page background                               |
| `--color-base-200`           | `#121a23` | `#ffffff` | Surfaces: cards, sidebar, inputs on cards     |
| `--color-base-300`           | `#22303e` | `#dbe1e9` | Borders, dividers, hover fill                 |
| `--color-base-content`       | `#e6eaf0` | `#121821` | Text. Secondary text at 65%, hints at 50%     |
| `--color-primary`            | `#22c5e8` | `#0a7a98` | Primary buttons, active states, focus ring    |
| `--color-primary-content`    | `#06141a` | `#ffffff` | Text on a primary fill                        |
| `--color-primary-soft`       | `#6fe3f5` | `#0a6f8a` | Links, "NEO", primary-tinted text             |
| `--color-meta`               | `#4fd8f0` | `#0a6f8a` | Game metadata area                            |
| `--color-sap`                | `#f07ad8` | `#a8308f` | System art packs area                         |
| `--color-reward`             | `#ffd166` | `#94600a` | Rewards, XP, ratings (also `--color-accent`)  |
| `--color-community`          | `#5be3a3` | `#177a4c` | Community, users, dashboard                   |
| `--color-gold/silver/bronze` |           |           | First three places of a ranking (`rank-1..3`) |
| `--color-success`            | `#3fae7b` | `#1d7f53` | Approved, complete                            |
| `--color-warning`            | `#d9a03f` | `#9a6410` | Pending, warnings                             |
| `--color-error`              | `#e2665e` | `#c2372e` | Rejected, destructive actions, errors         |

- Contrast: dark text on the bright cyan button is 9.1:1; white on the light
  theme's deep cyan is 4.9:1. Section colors are above 7:1 on dark surfaces
  and above 4.9:1 on light ones.
- **Tones.** `tone-meta`, `tone-sap`, `tone-reward`, `tone-community` and
  `tone-primary` set `--tone`; `tone-chip` (tinted icon well), `tone-text` and
  the sidebar links read it. A page gives an element its area color with one
  class.
- No gradients on text or buttons, no glass, no decorative glows. The one
  backdrop effect is `art-backdrop`: a header behind which the page's own
  artwork is blurred and darkened (game and pack pages, pack cards).

## Typography

- **Oxanium** (500, 600, 700) for headings (`h1`-`h3`, automatic) and headline
  numbers (`font-display`). Squared and technical, a companion to Anta.
- **Barlow** (400, 500, 600) for the interface and text.
- **IBM Plex Mono** (400, 500) for hashes, sizes, ids and code.
- **Anta** only for the wordmark.

| Step | Size / line height | Use                                    |
| ---- | ------------------ | -------------------------------------- |
| xs   | 12 / 16            | Badges, captions, table meta           |
| sm   | 14 / 20            | UI text, buttons, labels, dense lists  |
| base | 16 / 24            | Paragraphs, descriptions               |
| lg   | 18 / 28            | Lead text, card titles on detail pages |
| xl   | 22 / 28            | Section headings                       |
| 2xl  | 28 / 34            | Page titles                            |
| 3xl  | 40 / 44            | Home headline only                     |

Body copy stays under 72 characters per line (`max-w-prose`).

## Spacing

A 4px scale (Tailwind's default). Inside cards 16 or 20px; between page
sections 32px; the content column is 1152px (`max-w-6xl`) with 32px side
padding on desktop and 16px on phones.

## Shape and depth

- Radius: 6px for controls and badges, 10px for cards and panels, full only
  for avatars, rank numbers and progress rings.
- Shadows: none in the page. Overlays (dialogs, menus) use one shadow.
- Cards lift on hover by changing the border to primary at 45%, without
  moving.

## Components

- **Buttons.** Primary: cyan fill with `primary-content` text. Secondary and
  outline: surface fill, 1px border. Ghost: text only. Danger: error fill.
  `btn-error`: quiet destructive (error text and border, filled on hover),
  used instead of `btn-outline`. 2px focus ring, 50% opacity when disabled.
  Heights: 32 (sm), 40 (default), 48 (lg).
- **Navigation.** `base-200` sidebar. Each item's icon takes its area tone;
  the active item gets the tone at 16% and a 2px bar on the left. The collapse
  button is a fixed 36px square at the right of the brand row.
- **Stat tiles.** `tone-chip` icon plus the number in `font-display` and
  `tone-text`.
- **Rankings.** Positions 1-3 use gold, silver and bronze.
- **Home hero.** Headline with "NeoAssets" in soft cyan, next to a staggered
  wall of the most scraped games' box art.
- **Footer.** Static at the end of the content; links to the brand kit,
  NeoStation, Discord and Patreon.
- **Dialogs.** `Modal` with the overlay shadow, `base-200` panel, 10px radius.

## Imagery and icons

- Box art, logos and screenshots are shown at their aspect ratio, never
  cropped by decorative frames.
- Icons: Lucide only, 16px in UI text and 20px in headers, current text color
  or the area tone. No emoji as icons.
- Flags (flag-icons) only next to region names.
