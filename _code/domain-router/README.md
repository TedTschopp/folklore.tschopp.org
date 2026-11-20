# Publication domain router

This small Worker serves folklore.tschopp.org from the independently deployed
GitHub Pages origin and maps inventoried TedT.org collection, article, and category URLs to it.
It forwards public GET/HEAD requests without cookies or authorization. It stores
no content and sends no Webmentions. Query strings are redacted in observability;
traces and exporters are disabled.

Cloudflare Custom Domains creates the scoped DNS record and certificate using the
existing Workers login. No new persistent credential or paid plan is required.

```sh
node --test _code/domain-router/worker.test.mjs
wrangler deploy --config _code/domain-router/wrangler.json
```

The configured scopes cover the dedicated custom domain, the old `/folklore`
collection, `/Swiss-Folklore` articles, the Chriemhild article, category addresses,
and four dated aliases. Legacy scopes cover both TedT hostnames and HTTP/HTTPS.
Only the explicit entries in `routes.json` redirect; unknown paths pass through
to TedT.org. The Blood Comet fragment redirects to its new raw TedT `/stories/`
address. Old translation addresses resolve to current English URLs in one hop.

Deploy the folklore site first, then the TedT homepage and static fallbacks, and
only then this routing update. Verify all 266 inventoried addresses and the raw
fiction fragment. Tests include encoded Unicode, query strings, source aliases,
comparison pairs, and coverage by the configured Cloudflare scopes.

The repository must have no Pages custom domain/CNAME: the Worker fetches its
native project origin. Normal site deployments require only the Pages workflow;
redeploy the Worker only when its code or migration map changes.

Rollback: restore the full old collection in TedT.org, deploy and verify it,
then restore the previous Worker code and route configuration. Keep the new hostname working
until links can be reconciled. Preserve the explicit aliases indefinitely.
