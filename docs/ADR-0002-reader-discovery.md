# ADR 0002: A reading front door and bounded discovery pages

Status: Accepted
Date: 2026-11-20
Decision owner: Ted Tschopp
Authorization: The user selected option A, Reading and discovery, after reviewing the live indexes and three proposed directions.

## Problem

The 3,858-story collection outgrew its pilot navigation. Themes rendered
156 groups with 5,902 story links; Places rendered 4,021 story links under
mixed geographic labels. The homepage started a 78-page alphabetical list.
Search displayed long result lists with repeated section excerpts, while the
entity profiles covered only five pilot tales.

## Decision

Give the homepage suggested tales and three routes: short reading, topics and
places. Keep the complete alphabetical catalogue at `/stories/`, preserving
the existing `/page/2/` through `/page/78/` routes. Provide twelve broad topic
collections, separate paginated pages for every detailed topic/place, a guide
with cited examples, and an optional research index. Show at most 24 stories
per discovery or search result page.

`scripts/build_discovery.py` reads only the already-approved public archive,
reader guides and story exports, plus reviewed navigation copy in
`_data/folklore/discovery_editorial.json`. It writes deterministic data and
ordinary Jekyll pages before the existing Jekyll build. It introduces no
Jekyll plugin, collection, external service, account or browser framework.
Generated pages are committed so a plain Jekyll build also works. The Makefile
refreshes them for subsequent approved publication exports.

The new data retains exact named-place associations. Only reviewed aliases
are consolidated. Basel, Appenzell and Jura are described as regions where
the label does not identify a single canton. No coordinates or precise
geographic containment are inferred. Related-story links use existing topic
or place associations. Reading time counts the English story at 200 words
per minute, excluding notes and the original-language text.

The installed Pagefind 1.6 components handle search input, filters and summary.
The documented instance API supplies a bounded results view and query URL
state. Search considers both English and original texts and reader notes;
credits and related-story cards are excluded from text ranking. Story source
credits remain visible and intact.

## Preservation and verification

Story URLs, original/English paragraphs, notes, source editions, response
targets, copy groups and four unresolved comparison pairs remain unchanged.
Old theme/place fragment links resolve to their dedicated index pages.
Discovery and catalogue browsing work without JavaScript; full-text search
has a static-browsing fallback. The shared global header and analytics
runtime remain consumers of TedT.org's assets.

Validate deterministic generation, published-only membership, all old index
fragment mappings, bounded pagination, source/prose preservation, search
filters and URL restoration, no-JavaScript browsing, keyboard use, responsive
layout and contrast in both themes. Run `make check` and the existing router
tests before release. Real response submissions stay disabled in verification.
