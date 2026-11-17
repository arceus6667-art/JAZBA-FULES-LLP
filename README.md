# Jazba Fuels LLP

A responsive corporate website and private **Jazba Command Centre**, implemented from the client's two master prompts and original branding assets.

## What is included

- Next.js App Router, React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons, Prisma and SQLite.
- Bright white, navy, gold and orange public website; responsive navigation, leadership, industries, app announcement, legal pages, SEO metadata, sitemap and robots rules.
- Current official golden-swoosh logo and horizontally displayed delivery truck photograph, with original client assets retained as source references. No generated truck, replacement logo, invented customer logos, contact numbers, testimonials or operational statistics.
- Inquiry form with server validation, explicit consent, honeypot, persistent rate limiting, database storage and a success dialog only after confirmed storage.
- Hidden simultaneous **Z + X + C** shortcut. On mobile or with a keyboard alternative, visit **`/admin`** directly. The shortcut does not grant access.
- Administrator password hashing with scrypt, hashed server-side session tokens, HTTP-only cookies, eight-hour sessions, logout, same-origin mutation checks and persistent login restrictions.
- Inquiry search, status/date filters, pagination, private notes, selected/filtered CSV export, archive status and confirmed deletion.
- Consent-based first-party traffic measurement; real database aggregates, date filters, charts and CSV export. Estimated visitor counts are explicitly labelled. DNT/GPC are respected; no browser fingerprinting.
- Draft/published/archived announcements and app updates; image library, screenshots, release history, app status and publication preview.
- Private file storage, SHA-256 integrity checks, image validation and APK verification integration. Public APK downloads require a published Released record and a verified official APK.
- Website settings, administrator audit log, consistent SQLite snapshot backups, file manifest verification and restore verification script.

No administrator, inquiry, announcement, traffic record or app binary is seeded into production. Integration fixtures run in a separate disposable database.

## Run locally (Node.js 24)

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env; replace IP_HASH_SECRET with a random secret (at least 32 characters).
npm run db:deploy
npm run dev
```

Open `http://localhost:3000`. SQLite is stored at `prisma/data/jazba.db` with the example configuration. Uploads are stored in `storage/`. Both are ignored by Git. If a database URL uses a relative path, Prisma resolves it relative to `prisma/schema.prisma`.

For a production build:

```powershell
npm run build
npm start
```

Set `SITE_URL` to the actual origin, including the port for local testing. Forms reject requests from other origins. `SITE_URL` is also used for canonical infrastructure metadata, Open Graph, sitemap and robots; rebuild after changing the public origin because sitemap and robots are build-time outputs.

### Create the first administrator

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` through your server's secret environment, then run:

```powershell
npm run admin:create
```

The password must contain at least 14 characters. The command never prints credentials, never resets an existing account implicitly, and does not create default credentials. Remove the password from the runtime environment after provisioning. To explicitly rotate an existing password and revoke its sessions:

```powershell
npm run admin:create -- --reset
```

In PowerShell, a secure prompt can provide a temporary process environment value without storing the password in shell history:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Administrator email'
$adminSecret = Read-Host 'Administrator password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
Remove-Item Env:ADMIN_EMAIL
```

## Production hosting and persistence

This application needs a **Node.js server with persistent writable storage**. It is not a static export. Do not run its SQLite file or private uploads on an ephemeral/serverless filesystem. This repository includes Docker and Compose for a single-instance deployment. A public host/domain has not been provisioned by this repository.

1. Set a real HTTPS `SITE_URL` and random `IP_HASH_SECRET` in the server environment.
2. Run `docker compose up --build -d`. Named volumes preserve `/data/jazba.db` and `/storage` across container restarts and image updates. Never remove these volumes during upgrades.
3. Place a TLS reverse proxy in front of the loopback-bound port. The browser and server must share the configured HTTPS origin. Production session cookies must be Secure.
4. Provision an administrator inside the container using `npm run admin:create` with temporary secret environment variables. Do not bake administrator credentials into an image or commit them.
5. Back up both named volumes, restrict their filesystem permissions, and test restoration before relying on the deployment.

`TRUSTED_IP_HEADER` may name a client-IP header **only if the trusted proxy overwrites it and direct access to the app is blocked**. Otherwise, requests share a conservative rate-limit bucket (10 contact attempts/hour, 30 login attempts/15 minutes, plus 6 attempts/account/15 minutes). No untrusted forwarded header is used by default. Increase traffic limits only after configuring a trusted proxy and abuse monitoring.

Run `npm run maintenance` daily through the host's scheduler. It deletes expired login sessions, expired rate-limit counters and visitor records inactive for 90 days (including associated page views). Inquiry retention is managed by authorised administrators according to actual business needs.

SQLite and local disk suit a single-instance small corporate website. A multi-instance deployment needs a planned migration to self-hosted PostgreSQL and shared persistent file storage; changing the datasource provider alone is not a migration.

### APK release verification

The supplied assets contain no official application binary. The public app remains **Coming Soon** until an administrator publishes an update.

Before accepting APKs, install maintained **ClamAV** (with current definitions) and Android SDK **apksigner** on the server, configure `CLAMSCAN_PATH`, `APKSIGNER_PATH` and `APK_CERT_SHA256` to the official signing certificate's SHA-256 fingerprint. Commands run without a shell and have timeouts. An APK must pass the malware scanner, signature verification and certificate match. Failure or missing configuration blocks storage/publication. The default Docker image intentionally does not claim to include these external tools; extend it with your approved scanner/Android SDK installation before enabling releases.

Image uploads allow JPEG/PNG/WebP up to 5 MB and are decoded for validation. SVG is not accepted. APK uploads allow up to 50 MB. Uploaded files have random server filenames, remain outside `public/`, and require authentication unless referenced by published content. Referenced files must be detached from all records before deletion. The three original branding files cannot be deleted from the dashboard.

The integration suite verifies rejection of unconfigured APK uploads and the public-release gate. A successful scan/signature path still requires testing with your real signed APK and production scanner installation.

## Backup and restoration

The administrator's Backup Management page downloads a `.tar.gz` containing:

- `jazba.db`: a consistent SQLite `VACUUM INTO` snapshot, checked with `PRAGMA integrity_check`;
- `files/`: private uploads referenced by that snapshot;
- `manifest.json`: creation timestamp and SHA-256 checksum for each file.

Keep archives encrypted and outside the webroot; they contain inquiries and administrator password hashes. Pause writes during backup, schedule daily filesystem/volume backups, and apply your organisation's retention policy. The dashboard download is a manual backup, not a background scheduling service.

Restore into a **stopped** application:

```powershell
# Inspect/extract a trusted backup into a private folder, then verify:
tar -xzf jazba-backup.tar.gz -C private-restore
node scripts/verify-backup.mjs private-restore
```

After verification, preserve the current data as a rollback copy. Replace the configured database file with `private-restore/jazba.db` and the storage directory contents with `private-restore/files/`. Keep the SQLite filename/path unchanged in `DATABASE_URL`, apply owner-only permissions, and run `npm run db:deploy` before restart if upgrading schema. Revoke restored login sessions using `DELETE FROM AdminSession;` through a trusted local SQLite client before reopening access. Run a login and inquiry smoke test. Never expose the restore folder through the website.

The verification script checks every manifest checksum, SQLite integrity, and consistency between uploaded-file records and the manifest. It does not overwrite any live database.

## Verification

```powershell
npm run build
npm test
npm run typecheck
npm audit
```

The integration tests start a production server on port 3107 and apply committed migrations to a new disposable SQLite database. They verify public pages, original branding, inquiry validation/consent/storage, access control, origin checks, password login/cookies, search/status/notes/CSV injection protection, analytics consent/DNT, private upload visibility, announcement publication/unpublication, app status/release gating, settings validation, backup/checksum verification, server-restart persistence, logout revocation and login restrictions. Shortcut tests cover simultaneous keys, repeat protection, editing fields and blur reset.

## Content provenance

- Client specification: referenced ChatGPT conversation “Website Plan for Jazba Fuels”, containing the two recreated master prompts.
- Office address: client's original corporate letterhead. It is presented as an **office**, not independently asserted as a registered address.
- Current director display names: **Asmita J Angare** and **Jitendra Angare**, supplied on the updated business card and identified as directors by the client. Their business contact numbers are displayed from that card.
- LLPIN AAV-6067 and incorporation on 27 January 2021: supplied prompts and corroborating public listings, including [CorporateDir](https://corporatedir.com/company/jazba-fuels-llp). Directory status/partner data is not represented as a current official MCA verification.
- Truck image: `WhatsApp Image 2026-11-17 at 11.47.17 PM.jpeg` → `public/brand/truck-original.jpeg` (original bytes; display-only rotation).
- Logo: `WhatsApp Image 2026-11-17 at 11.43.06 PM.jpeg` → `public/brand/logo-original.jpeg` (original bytes).
- Letterhead: `WhatsApp Image 2026-11-17 at 11.42.36 PM.jpeg` → `public/brand/letterhead-original.jpeg` (original bytes; visual reference and Open Graph image).
- Embedded third-party marks on original assets are not treated as proof of current commercial partnerships. No additional partner claims or fabricated contact details are published.
- Manrope and Inter are self-hosted; their SIL Open Font License notices are in `public/fonts/`.

The included privacy and website terms describe the implemented workflow. The owner should approve the wording and actual operating/retention practices before public launch.

## Updated brand and service information

The client supplied the current truck photograph (`public/brand/delivery-truck.png`), official golden-swoosh logo (`public/brand/jazba-fuels-logo.png`) and business card (`public/brand/business-card.png`). These replace the earlier assets in the public interface. The Why Us section and hero now state the client-confirmed IndianOil association, premium-grade diesel quality and delivery within 30 minutes. No dealership status or independent certification is inferred. The mobile-app announcement uses formal development language and a CSS-rendered three-dimensional phone concept. Website tests were intentionally not run for this update, as requested by the client.
