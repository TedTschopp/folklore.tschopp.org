# Publication domain router

This small Worker serves folklore.tschopp.org from the independently deployed
GitHub Pages origin and maps only inventoried TedT.org collection URLs to it.
It forwards public GET/HEAD requests without cookies or authorization. It stores
no content and sends no Webmentions. Query strings are redacted in observability;
traces and exporters are disabled.

Cloudflare Custom Domains creates the scoped DNS record and certificate using the
existing Workers login. No new persistent credential or paid plan is required.

```sh
node --test _code/domain-router/worker.test.mjs
wrangler deploy --config _code/domain-router/wrangler.json
```

The final routes include the dedicated custom domain and the old collection's
`https://tedt.org/folklore/*` and exact `https://tedt.org/folklore` routes.
Add the legacy routes only after the new hostname passes verification. Unknown
paths and the two exceptions in migration.json pass through to TedT.org.

The repository must have no Pages custom domain/CNAME: the Worker fetches its
native project origin. Normal site deployments require only the Pages workflow;
redeploy the Worker only when its code or migration map changes.

Rollback: restore the full old collection in TedT.org, deploy and verify it,
then remove only the two old-prefix Worker routes. Keep the new hostname working
until links can be reconciled. Preserve the explicit aliases indefinitely.
