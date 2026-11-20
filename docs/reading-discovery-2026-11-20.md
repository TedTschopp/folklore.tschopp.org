# Reading and discovery — November 20, 2026

The user selected option A after reviewing the published indexes. This release
gives the 3,858-story collection a reading front door while keeping the complete
catalogue, original texts, notes, source credits and story URLs intact.

- **Start here:** three short suggested tales, reviewed story introductions,
  a longer selection and routes into short reading, topics and places.
- **Topics:** twelve introductions lead to separate results pages. The 156
  recorded labels remain searchable in the optional detailed index.
- **Places:** 23 regional/canton groups and a searchable directory of 243 place
  groups. Four across-Switzerland labels are consolidated. Recorded names and
  geographic uncertainty are retained; no coordinates are inferred.
- **Guide:** eight terms explained with links to their existing reader notes,
  an introduction to beings/beliefs and an explanation of the reading sources.
- **Search:** full English/original text and note search, topic/region/reading-time
  filters, optional place/collector/recorded-label filters and 24 results per
  page. Filter/query/page state survives links, reloads and Back navigation.
- **Continue exploring:** up to three other tales connected by their recorded
  topics or places. They remain separate stories with their own source credits.

The alphabetical catalogue starts at `/stories/`. The existing `/page/2/` onward
routes remain valid. Old theme/place fragment links resolve to their dedicated
result pages; selected early place profiles and classifications remain in the
research area. Detailed-label and paginated topic/place result pages do not enter the sitemap.

The shared header and analytics remain centrally hosted consumers. Existing
response aliases and outgoing:false entries are preserved. All Webmention
verification uses mocked submissions. The TTRPG site is unaffected.

`make check` passes the production Jekyll build, Pagefind indexing, analytics
finalization/audit, complete approved-text/note/source/canonical checks, all 78
catalogue pages, all 1,126 generated result pages, response checks and browser
journeys. Browser checks cover direct and legacy navigation, place aliases,
combined filters, bounded result pages, bookmarked page restoration, glossary
source links, no-JavaScript reading and mobile contrast in parchment and dusk.
The seven existing domain-router tests pass.

The generating decision and maintenance workflow are in
[ADR 0002](ADR-0002-reader-discovery.md) and the repository README. Generation
uses only approved public exports; no source clearance or new story publication
is implied by this navigation release.
