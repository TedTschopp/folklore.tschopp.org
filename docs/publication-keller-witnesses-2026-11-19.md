# Four Keller tellings from the original 1927 edition

This release adds four bilingual pages and 13 reader notes. The collection now
has 3,857 bilingual pages, 14,034 reader notes and two source-note pages, for
3,859 canonical pages. All 3,855 previous story/source-note stubs and 3,853 previous
reader guides are preserved without changes.

| English title and canonical URL | Keller's printed pages |
| --- | --- |
| [The Enchanted Jug](https://folklore.tschopp.org/stories/the-enchanted-jug/) | 243–248 |
| [The Marvelous Barge](https://folklore.tschopp.org/stories/the-marvelous-barge/) | 7–18 |
| [The Poor Weaver and His Good Fortune](https://folklore.tschopp.org/stories/the-poor-weaver-and-his-good-fortune/) | 143–147 |
| [The Story of a Sorcerer](https://folklore.tschopp.org/stories/the-story-of-a-sorcerer/) | 139–142 |

## Edition evidence

The source is Walter Keller, *Tessiner Märchen*, collected and translated by
Keller, Frauenfeld and Leipzig: Huber & Co., 1927. The complete
[Google Books scan](https://books.google.com/books?id=b5wOAQAAMAAJ) was downloaded
and its original title, printed 1927 imprint and every page of these four tales
were visually checked. PDF body pages are printed pages plus six. The private
authoring review retains the source PDF, SHA-256 receipt, page mapping, proof
sheets, complete text collations and individual editorial decisions.

The catalogue is a transcription with small variants. Barge changes ordinary
wording and adds a short waiting clause. Sorcerer omits the sentence saying the
boy takes ninety-nine wedges, although the next paragraph still explains the
two deliberately missing wedges. Weaver has small grammatical differences;
the catalogue's 1929 narrator date does not date a story already printed in
1927. Jug changes the cow's first name from German Blonde to Italian Bionda.
Each page explains its differences in Reader notes. These are individually
reviewed minor variants; no automatic similarity threshold or literal-match
claim was used. Approved original and English paragraphs remain unchanged.

The 13 reader notes retain the inherited explanations and add source context,
Ticino polenta and Roman amphorae. Existing Marengo/Marenghi notes receive a
Swissmint citation. Themes for these four pages were reviewed manually.

## Remaining evidence holds

This follow-up reviewed all 61 outstanding evidence cases, cleared four and
retained 57. Across the original 649-story review, 29 now have publish decisions
and 620 remain held, including 563 verified 1945 Uri records. The king's-son
Keller version remains held because it changes the historical cannon and its
firing language to a pistol. The newly located 1916 Bächtold *Blue Bird* differs
from the held later German wording and does not clear it. Other original German
scans and exact-edition comparisons remain necessary; narrator dates and older
plots alone do not clear later expressions.

The four comparison pairs stay separate and all 18 combined-copy groups,
existing title URLs, response aliases and moderation settings are preserved.
The release contains no raw corpus or source PDFs and sends no Webmentions.

## Reproduction and validation

The private cumulative release and reader guide are named
`2026-11-19-keller-witnesses`. Its immutable source-data commit is
`2700fdf9a4f1b1961701329d39cffb8bfe74c1a2`. Private validation passed all 157
tests and verified unchanged hashes for all 7,381 prepared records.

Run `make check` for the production Jekyll build, Pagefind, source and paragraph
comparison, response tests, browser access and contrast checks. Run
`node --test _code/domain-router/worker.test.mjs` for the unchanged router
contract. Browser Webmention submissions are mocked.
