# Swiss Folklore

The public reading site at **https://folklore.tschopp.org/**. It has its own
Jekyll build, Pagefind index, sitemap, and GitHub Pages deployment.

This repository contains the approved public edition: 3,858 bilingual tales,
14,060 reader notes, and two held source-note pages. The private authoring corpus,
raw source documents, unreviewed backlog and editorial tools remain in
`TedTschopp/swiss-folklore`. The November 19 release adds 3,627 explicitly reviewed stories; the source and
publication checks are recorded in docs/publication-2026-11-19.md. The subsequent
source review clears another 23 translations; see
[the clearance release](docs/publication-source-clearances-2026-11-19.md). The next evidence follow-up adds two more; see
[the follow-up review](docs/publication-evidence-followup-2026-11-19.md). The complete
1927 Keller scan clears four further tellings with 13 reader notes; see
[the Keller review](docs/publication-keller-witnesses-2026-11-19.md).
The Kuoni 1903 witness adds The Three-Legged Hare with four reader notes; see
[the Kuoni review](docs/publication-kuoni-witness-2026-11-19.md).

The November 20 editorial review corrects 314 titles, moves 349 canonical URLs
to English wording, and completes 18 title-dependent openings. It preserves
every previous URL, all 14,038 existing explanations and their note bookmarks.
See [the editorial review](docs/editorial-integrity-2026-11-20.md).

The [source-scan follow-up](docs/transcription-scans-2026-11-20.md) restores three
initial letters in original-language text and adds three evidence notes. The
[Little Cat follow-up](docs/little-cat-scan-2026-11-20.md) confirms its ornamental
V in an undated printed copy catalogued [1917]; the exact 1915 edition remains
uninspected. English translations and story URLs are unchanged.

## Reading and discovery

The homepage offers a few reviewed starting stories and routes into short tales,
twelve topics and places. The complete alphabetical catalogue is at `/stories/`;
the existing `/page/2/` and subsequent catalogue URLs remain available.

`/guide/` explains unfamiliar words with links to existing reader notes.
`/research/` retains all recorded topic labels. Places consolidate the four
across-Switzerland labels; Basel, Appenzell and Jura are shown as regions rather
than assigned to a guessed canton. The selected legacy profiles remain available.

Navigation data and ordinary Jekyll listing pages are built by
`scripts/build_discovery.py` from approved public exports and the reviewed copy
in `_data/folklore/discovery_editorial.json`. Run `make build` after an approved
export; it refreshes the derived data and generated pages. Never edit the generated
listing stubs directly. A plain `bundle exec jekyll build` can also use the
committed generated files. See [ADR 0002](docs/ADR-0002-reader-discovery.md).

Search retains the installed Pagefind components with topic, region and reading-time
filters. Named-place, collector and detailed-label filters are available on demand.
Results are paginated in groups of 24; query and filter state can be bookmarked.
Reading times cover English story text at 200 words per minute, excluding notes.

## Collection illustrations

The homepage, main reading and reference routes, twelve topic cards and topic
landing pages carry contemporary wordless illustrations. Region and named-place
landing pages use a shared wayfinding still life, not a claimed view of that place.
Paginated result pages keep their compact reading layout.

`_data/folklore/illustrations.json` maps routes to the 16 plates and holds alt text,
captions and generation provenance. `_includes/folklore/plate.html` serves four
responsive WebP sizes, reserves the image dimensions, loads header plates eagerly
and card art lazily. The existing semantic tokens and frame component supply the
parchment/dusk presentation. No story front matter or approved text is changed.

The original prompt set and asset details are in
`docs/illustrations-2026-11-20.json`; originals are retained with the project
artwork. The public About page distinguishes these new AI-assisted illustrations
from historical source evidence. Reuse an existing plate via the route map rather
than adding imagery to each generated listing stub.

## Build and verify

Use Ruby 3.2+ and Node 22+:

```sh
bundle install
npm ci
make build
npx playwright install chromium
npm test
```

`make check` also runs response-routing tests and browser checks. Browser tests
intercept the Webmention receiver and analytics; they never publish a response.

The source files remain in `folklore/` to retain their existing source identities;
their explicit permalinks publish at `/stories/`, `/search/`, `/locations/`,
`/themes/`, `/entities/`, `/page/N/` and `/`.

## Publication and design

English translations always supply the page heading. Historical original titles
remain with the original-language text and in search. Existing duplicate groups
share a page. The four comparison pairs remain separate. Do not change the
approved paragraph text when adding notes or changing a template.

The interface uses **Märchen Engine Design v2**: parchment and dusk grounds,
Alegreya reading type, IM Fell English display, brass rules and herbarium greens.
Its tokens, CSS component styles and OFL fonts are self-hosted. No game rules,
character sheets or TTRPG runtime are included. Commercial font files are omitted.
The public reading site also retains mobile and print access.

The shared global header and analytics runtime are loaded from TedT.org. The
appearance preference is local to this hostname because tschopp.org and tedt.org
are different root domains. The existing GA4 and Clarity configuration is shared;
the TedT.org-specific Cloudflare beacon token is not reused on the new root.

## Hosting and migration

GitHub Actions builds and deploys this small site independently of TedT.org.
The native Pages origin is `https://tedtschopp.github.io/folklore.tschopp.org/`.
A small Cloudflare Worker owns the public custom domain and fetches that static
origin. The Worker also redirects explicitly mapped old collection URLs directly
to their new canonical pages, retaining query strings and browser fragments.
Unrelated routes, including the embedded Blood Comet fragment and the older
Brunnegg article alias, continue to belong to TedT.org.

`_data/folklore/migration.json` records the old canonical URLs and aliases. All
approved source records, the four comparison pairs and story slugs are retained.
See [the architecture decision](docs/ADR-TBD-dedicated-swiss-folklore-site.md).

The origin repository must not have a GitHub Pages custom domain/CNAME: the
Cloudflare Worker is the public hostname and fetches the native origin directly.
This avoids a redirect loop. `_code/domain-router` documents deployment/rollback.

## Discussions and Webmentions

Existing Mastodon post IDs and thread links are unchanged. Each story advertises
the existing account endpoint, and the homepage advertises it for domain proof.
The public response refresh queries both new URLs and all old aliases, through
webmention.io's public API only. Existing moderation rules remain in effect;
unknown sources are held until approved. Raw incoming responses and private
account-level queries are never published. All entries disable outgoing mentions.

The response workflow runs hourly or manually. A refresh failure retains the last
approved snapshot. Use its manual approve/block action for a numeric mention ID,
then refresh to publish the moderated result. No migration workflow creates a
Mastodon thread or sends an outgoing Webmention.

## Future stories

Export newly reviewed release batches from the private authoring repository into
this site, check the source/reader-note comparison, build search, run browser and
accessibility checks, then publish through its own deployment. The publication
exporter's target configuration must use the new origin with an empty URL prefix.
