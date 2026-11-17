# Jazba Fuels LLP — hosted website

The website uses Next.js to author and prerender its public interface. The build strips unused hydration code and embeds the required HTML, CSS, fonts and optimised images into a dependency-free Cloudflare Worker.

The Worker serves the public site and accepts POST /api/contact. Valid inquiries are saved in the private Sites D1 database, binding DB. There is no public inquiry listing or read endpoint. Authorised owners can retrieve records through Sites database tools. Full dashboard modules remain in the primary GitHub application.

The form validates fields and consent, displays loading/errors, prevents accidental duplicate requests using a submission UUID, and displays success only after confirmed database storage. The server implements same-origin checks, parameterised queries, a honeypot and persistent rate limiting. A secret CONTACT_HASH_SECRET is configured through Sites runtime secrets, never committed to source.

Build: npm ci && npm run build.
Database schema: db/schema.ts. Generate new migrations with npm run db:generate. Published migrations are immutable. Sites applies the committed drizzle migrations before Worker publication.

The original branding assets are retained; public images use optimised WebP derivatives. The public JavaScript remains small and independent of React hydration. No advertising SDK or tracking script is installed.

Source: https://github.com/arceus6667-art/JAZBA-FULES-LLP
