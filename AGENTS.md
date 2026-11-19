# Swiss Folklore publication

This is the independently built Jekyll reading site for folklore.tschopp.org.
The private `TedTschopp/swiss-folklore` repository remains the authoring source.
Only explicitly approved exports belong here. Do not publish the raw corpus,
source documents, unreviewed stories, or private incoming response data.

- Use GitHub Pages-compatible Liquid and the existing redirect plugin.
- Keep the four unresolved comparison pairs separate and preserve title slugs.
- Preserve approved English/original paragraphs, reader notes and source credits.
- Use the Märchen Engine Design v2 skill for this folklore site only. Do not
  modify a TTRPG site or add game mechanics to the reading experience.
- Keep public reading responsive and accessible; the game-table minimum width
  in the design skill does not apply to this public reading site.
- Brand tokens/assets live under assets/marchen; commercial fonts are omitted.
- Load the shared header and analytics from https://tedt.org; do not fork them.
- Run `make check` before release. Browser Webmention submissions must be mocked.
- Keep legacy URLs as response aliases; all publication entries have outgoing:false.
- Domain routing lives in _code/domain-router. Run its Node tests before deploying
  with the existing Cloudflare login. Do not create or broaden credentials.
