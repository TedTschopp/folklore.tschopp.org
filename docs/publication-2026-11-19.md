# November 19, 2026 publication release

This records the initial bulk release. The
[subsequent source-clearance review](publication-source-clearances-2026-11-19.md)
publishes 23 of its 649 holds and leaves 626 held.

This release adds **3,627 stories**, bringing the reading collection to **3,828
bilingual pages**, **13,861 reader notes**, and the two existing source-note
pages. All stories appear in the 77-page catalogue, full-text search, and the
canonical sitemap. New stories retain the existing English/notes/original
reading navigation, discussion links, and Webmention controls.

The private authoring repository retains the complete source records and the
release decisions. Every exported passage is bound to its source snapshot by
SHA-256. Source edition citations appear separately from the narrative; verse,
informants, and historical authorial notes are retained. This release does not
claim fresh scan collation of every telling: it reuses the recorded translation,
source, and historical-scope reviews, and records additional edition checks.

Müller’s Uri citations were checked against the German National Library's
contents for the [1926 volume](https://d-nb.info/750142650/04) and the
[1929 volume](https://d-nb.info/780177339/04). Individually identified volumes
supply the catalogue date; the earliest year in a three-volume citation does not
clear the 1945 volume. English title overrides remove staged bilingual headings
and translate dialect phrases. Original titles remain under Original text.

Existing annotated translations and the previous 201 reader guides are retained.
Additional notes explain unfamiliar terms and practices with attributed sources.
Translation annotations on source ambiguities, title/text mismatches, and historical
prejudice are also retained; only processing metadata is omitted.
Short tellings without a glossary term have unanchored genre context. New
catalogue descriptions use identified story openings; the reading page does not
repeat that opening as a second introduction above the full translation.

The eighteen approved shared-page groups retain their sources and notes. No new
exact-copy groups were found. The four unresolved comparison pairs retain
separate canonical URLs. New collisions use readable place/collector qualifiers;
existing URLs and historical response aliases are preserved.

**649 translated records remain unpublished**: 584 unresolved Uri volume
assignments, 26 expanded-edition cases, 9 narrator dates requiring a publication
witness, 17 other mixed-edition cases, 2 later German translations of historical
French sources, and 11 undated texts. The
[private hold ledger](https://github.com/TedTschopp/swiss-folklore/blob/main/publication/reviews/2026-11-19-remaining/holds.json)
records each title, source locator, reason, and required evidence. These records
are excluded from the publication export, search, sitemap and public source tree.

The publication retains Märchen Engine Design v2 for folklore only. No TTRPG
runtime, source corpus, or private response data is included. Response refreshes
keep all historical aliases, batch up to 50 public targets per request, and pace
requests while retaining moderation and the last complete snapshot on failure.

Release verification uses `make check`, domain-router tests, exact comparison of
every rendered original/English paragraph and note, catalogue/search/sitemap
coverage, mobile and keyboard navigation, accessibility checks, and mocked
Webmention submission. Deployment and live-host verification are separate steps.
