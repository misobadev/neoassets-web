# NeoAssets design system

NeoAssets is a catalog: people browse thousands of games, compare media and
ROM hashes, and review contributions. The interface should feel like a
precise, quiet tool for a hobby that people care about, not like a game
launcher or a marketing page. Content (box art, screenshots, logos) brings the
color; the chrome stays neutral.

All values live as CSS variables in `src/index.css` (`@theme` and
`html.light`). Pages use the variable names and the utility classes (`card`,
`btn-*`, `badge-*`, `input`), never raw hex values.

## Color

One neutral scale, one brand blue for actions, one amber accent for ratings.

| Token                  | Dark      | Light     | Role                                                           |
| ---------------------- | --------- | --------- | -------------------------------------------------------------- |
| `--color-base-100`     | `#0f1216` | `#f5f6f8` | Page background                                                |
| `--color-base-200`     | `#161a20` | `#ffffff` | Surfaces: cards, sidebar, inputs on cards                      |
| `--color-base-300`     | `#272d36` | `#dde1e6` | Borders, dividers, hover fill                                  |
| `--color-base-content` | `#e4e7eb` | `#14181f` | Text. Secondary text is this color at 65%, hints at 50%        |
| `--color-primary`      | `#2f74c8` | `#2f74c8` | Primary buttons, active navigation, focus ring, selected state |
| `--color-primary-soft` | `#7fb0ec` | `#225aa0` | Links and primary-tinted text on the background                |
| `--color-accent`       | `#d9a03f` | `#a66d0c` | Ratings (stars) only                                           |
| `--color-success`      | `#3fae7b` | `#1d7f53` | Approved, complete                                             |
| `--color-warning`      | `#d9a03f` | `#9a6410` | Pending, warnings                                              |
| `--color-error`        | `#e2665e` | `#c2372e` | Rejected, destructive actions, errors                          |
| `--color-info`         | `#7fb0ec` | `#225aa0` | Informational notes (same hue as links)                        |

- The brand blue (`#4a90e2` in the logo) is darkened to `#2f74c8` for filled
  buttons so white text reaches 4.6:1. Body text on both backgrounds is above
  12:1; secondary text (65%) is above 6:1.
- `--color-secondary` is kept for existing badges but maps to the neutral
  scale; there is no second brand color.
- No gradients on text or buttons, no glows, no glass. A flat color with a
  1px border separates layers.

## Typography

- **IBM Plex Sans** for the interface and text (400, 500, 600). It is
  technical and readable at small sizes, which a dense catalog needs.
- **IBM Plex Mono** (400, 500) for hashes, sizes, ids and code.
- **Anta** only for the NeoAssets wordmark. It is the brand face; used for
  headings and body it read as a game skin and hurt legibility.

| Step | Size / line height | Use                                    |
| ---- | ------------------ | -------------------------------------- |
| xs   | 12 / 16            | Badges, captions, table meta           |
| sm   | 14 / 20            | UI text, buttons, labels, dense lists  |
| base | 16 / 24            | Paragraphs, descriptions               |
| lg   | 18 / 28            | Lead text, card titles on detail pages |
| xl   | 22 / 28            | Section headings                       |
| 2xl  | 28 / 34            | Page titles                            |
| 3xl  | 40 / 44            | Home headline only                     |

Headings use weight 600 and a slight negative tracking (-0.01em). Body copy
stays under 72 characters per line (`max-w-prose`).

## Spacing

A 4px scale (Tailwind's default). Inside cards 16 or 20px; between page
sections 32px; the content column is 1152px (`max-w-6xl`) with 32px side
padding on desktop and 16px on phones.

## Shape and depth

- Radius: 6px for controls and badges (`rounded-md`), 10px for cards and
  panels, full only for avatars and progress rings.
- Shadows: none in the page. Overlays (dialogs, menus) use one shadow:
  `0 16px 48px -12px rgb(0 0 0 / 0.45)`.
- Cards lift on hover by changing the border to primary at 45%, without
  moving.

## Components

- **Buttons.** Primary: blue fill, white text. Secondary/outline: surface fill,
  1px border. Ghost: text only, surface on hover. Danger: error fill. All 6px
  radius, 14px semibold text, a 2px primary focus ring offset by 2px, 50%
  opacity when disabled. Heights: 32 (sm), 40 (default), 48 (lg).
- **Links.** `--color-primary-soft`, underline on hover.
- **Inputs and selects.** Background `base-100` inside cards, 1px border,
  6px radius, primary border and ring on focus.
- **Cards.** `base-200`, 1px `base-300` border, 10px radius.
- **Badges.** 6px radius, tinted background (14% of the role color) with the
  role color as text; neutral badges are `base-300` with body text. A
  complete game shows a success badge, not a rainbow.
- **Navigation.** The sidebar is a `base-200` surface with a right border.
  Items are sentence case, 14px medium, secondary text color; the active item
  gets a primary tint and a 2px primary bar on the left. Section labels are
  12px, 50% text color, no tracking tricks.
- **Footer.** Static at the end of the content, not pinned to the viewport.
- **Dialogs.** `Modal` with the overlay shadow, `base-200` panel, 10px radius.

## Imagery and icons

- Box art, logos and screenshots are the visual content: shown at their aspect
  ratio, on a `base-100` well, never cropped by decorative frames.
- Icons: Lucide only, 16px in UI text and 20px in headers, stroke 1.75,
  current text color. No emoji as icons.
- Flags (flag-icons) only next to region names.
- The page background is flat; no dot grids or radial glows.
