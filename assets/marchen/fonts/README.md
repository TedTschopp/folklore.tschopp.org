# Märchen Engine — Fonts & Licensing

**Fully self-hosted — zero CDN dependency, works offline.** Every face is served
from this project. Policy lives in `tokens/fonts.css`.

## OFL spine — self-hosted from `fonts/webfonts/`

SIL Open Font License — free to embed, self-host, and redistribute.

| Face | Role (token) | Designer |
|---|---|---|
| **Alegreya** | body & headings — `--font-serif` | Huerta Tipográfica |
| **IM Fell English** | display, drop caps — `--font-display` | Igino Marini |
| **Alegreya Sans** | labels, UI — `--font-sans` | Huerta Tipográfica |
| **Alegreya Sans SC** | small-caps labels — `--font-sc` | Huerta Tipográfica |
| **Caveat** | clerk's quick hand — `--font-hand` fallback | Pablo Impallari |
| **Pinyon Script** | formal diary hand — `--font-script` fallback | Nicole Fally |
| **UnifrakturMaguntia / Cook** | Fraktur — `--font-fraktur` | j. 'mach' wust et al. |

Stored as **woff2**, **latin + latin-ext** subsets (each weight/style is two
files, carrying its original Google Fonts `unicode-range`). latin covers English
and German (umlauts, ß); latin-ext covers wider European diacritics.

## Licensed commercial faces — self-hosted from `fonts/`

Embedded under licence held by the project owner. `local()` is tried first, then
the bundled file.

| File(s) | Face | Designer / vendor |
|---|---|---|
| `DanaLibraryHand-*.woff2` | **Dana Library Hand** — `--font-hand` | Margo Burns |
| `OldManEloquent-*.woff` / `.ttf` | **Old Man Eloquent** — `--font-script` | Brian Willson · Three Islands Press |

## Fallback resilience

`'Alegreya Fallback'` (Georgia with metric overrides) sits in the
`--font-serif` / `--font-display` stacks so the body doesn't reflow while the
self-hosted Alegreya paints. All faces use `font-display: swap`.

## Regenerating / extending the OFL subsets

The `fonts/webfonts/` files were harvested from the Google Fonts CSS API. To
refresh them or add subsets/weights, fetch each family's `css2` URL, keep the
`@font-face` blocks for the subsets you want, download each `src` woff2 to
`fonts/webfonts/` as `Family-<weight>[i]-<subset>.woff2`, and paste the rules
(local paths + original `unicode-range`) into the OFL section of
`tokens/fonts.css`. Filenames map weight → `400/500/700/800/900`, italic → `i`
suffix, subset → `latin` / `latinext`.

To add more languages, harvest additional subsets (e.g. `cyrillic`,
`vietnamese`) the same way — they're already in the source CSS, just not bundled.

This publication ships only the OFL spine; commercial faces are omitted.
