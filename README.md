# Jazba Fuels LLP — hosted website

The website uses Next.js to author and prerender its public interface. The build strips unused hydration code and embeds the required HTML, CSS, fonts and optimised images into a dependency-free Cloudflare Worker.

The Worker serves the public site and accepts POST /api/contact. Valid inquiries are saved in the private Sites D1 database, binding DB. There is no public inquiry listing or read endpoint. Authorised owners can retrieve records through Sites database tools. Full dashboard modules remain in the primary GitHub application.

The form validates fields and consent, displays loading/errors, prevents accidental duplicate requests using a submission UUID, and displays success only after confirmed database storage. The server implements same-origin checks, parameterised queries, a honeypot and persistent rate limiting. A secret CONTACT_HASH_SECRET is configured through Sites runtime secrets, never committed to source.

Build: npm ci && npm run build.
Database schema: db/schema.ts. Generate new migrations with npm run db:generate. Published migrations are immutable. Sites applies the committed drizzle migrations before Worker publication.

The original branding assets are retained; public images use optimised WebP derivatives. The public JavaScript remains small and independent of React hydration. No advertising SDK or tracking script is installed.

Source: https://github.com/arceus6667-art/JAZBA-FULES-LLP

## Owner administration

Visit /admin and use Sign in with ChatGPT. Sites provides verified identity headers; every admin page and API call checks the server-side ADMIN_OWNER_EMAIL allowlist. This secret is configured from the verified Site owner account. The public website remains public. Do not implement the reserved authentication routes in application code.

The hosted dashboard provides actual inquiry counts, search/status/date filters, pagination, inquiry details, private notes, status updates, filtered CSV export and confirmed permanent deletion. Administrative mutations require same-origin requests and are recorded with the stable authenticated user ID. No inquiry data is embedded into public assets. Admin responses are private and not cached.

## Google AdSense

Public HTML pages include the owner-supplied asynchronous AdSense loader for ca-pub-5987635567718449. The export postprocessor inserts it after removing unused framework scripts, so it is preserved in the deployed output. Admin/login/error pages do not include ads. Public advertising pages receive fresh per-response script nonces and a strict-dynamic policy compatible with Google’s documented AdSense CSP integration. Administrative pages and API responses keep their existing restrictive policy. Complete site verification/review and configure Privacy & messaging in AdSense. No approval, ad serving or revenue is assumed.

## Search discovery

Public pages allow indexing; admin pages remain noindex and require owner authentication. Canonical URLs use https://jazbafuelsllp.com. The Worker serves /robots.txt and /sitemap.xml, and the homepage includes LocalBusiness JSON-LD using only the visible company details. The static delivery step preserves structured-data scripts. Search Console submission and Business Profile verification are separate account tasks; ranking or indexing is not guaranteed.
