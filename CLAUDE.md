PROJECT BRIEF

What this is
- Presentation website for ADN Auto Parc, a small used-car dealer in Romania (~10 cars in stock). Site language: Romanian, with correct diacritics (ș, ț with comma below).
- The dealer edits cars in Airtable from his phone. The site shows them automatically.
- Hosting: Netlify, deployed from the GitHub repo chislucaraul-debug/showroom-site (main branch = live site).

How it works today
- index.html: the whole site in one file. Hash routes: #/ (home: black hero + stock list with filters), #/masina/<slug> (car page), #/despre-noi, #/contact. Dealer details (name, phone, WhatsApp, address, hours, company data) are in the CONFIG block at the top of the script; they are still placeholders.
- On load, index.html fetches /api/cars. SAMPLE_CARS only shows in previews, never on the live site.
- netlify/functions/cars.mjs: reads the Airtable table and returns the cars as JSON at /api/cars. Field names are matched loosely (case, diacritics, brackets ignored). VIN and internal fields are never sent to the browser.
- brand/: logo files (SVG + PNG for light and dark backgrounds, app icons). favicon.ico, apple-touch-icon.png and site.webmanifest sit in the repo root.
- Netlify environment variables (already set, do not change): AIRTABLE_TOKEN (read-only), AIRTABLE_BASE_ID (app…), AIRTABLE_TABLE (tbl…), AIRTABLE_VIEW (viw…), optional DEBUG_KEY.
- Airtable fields: Titlu, Marcă, An, Kilometraj, Putere (CP), Capacitate (cm³), Combustibil, Cutie de viteze, Caroserie, Preț (€), Preț vechi (€), Status (Disponibil / Rezervat / Vândut / Ascuns), Poze, Recomandat (no longer used). Optional: Descriere, Dotări, Culoare, Normă poluare, Data vânzării.
- Brand: logo "Version B · Speed line" = a futuristic sports-car silhouette with orange speed lines, over the name "ADN AUTO PARC" in Unbounded (ADN extra-bold, AUTO PARC regular), with a short orange underline. App icon / favicon = the same car plus "ADN" in a black rounded square. Colors: black #0B0B0C, orange #FF5A1F, background #F4F4F1. Header, home hero and footer are black; orange is the accent (buttons, prices, highlights). Body font: Archivo.

Hard limits (free plans, must not be exceeded)
- Airtable Free: 1,000 API calls per month. cars.mjs calls Airtable at most about once per hour (CACHE_MINUTES = 60, durable CDN cache, in-memory cache, and any query string redirects to /api/cars). Never shorten this, never add scheduled or polling jobs that call Airtable, and keep the one-call-per-hour budget in any new design.
- Netlify Free: 300 credits per month. Each production deploy costs 15 credits; Deploy Previews are free. Page views and bandwidth are cheap. When credits run out the site pauses.

Working rules
- Never commit or push to main. Every change goes on a branch with a pull request, so Netlify builds a free Deploy Preview. Give me the preview link and a plain-language summary of what changed and what to check.
- Batch related changes into one pull request. Each merge to main costs 15 credits.
- Never change Netlify environment variables, never trigger production deploys, and never deploy to production through the Netlify connector. Merging is my decision.
- Never put tokens or secrets in the repo.
- Don't change cars.mjs unless the task needs it. If you do, explain why and confirm the Airtable call budget still holds.
- If a change would cost money or credits beyond one merge, ask me first.
- Raul pushes branches and opens pull requests himself in GitHub Desktop (Publish branch / Create Pull Request). Claude prepares the branch and commits locally, then tells him exactly what to click.

Roadmap
1. A real page per car, so WhatsApp/Facebook link previews show that car's photo, title and price, and Google can index each car. Must stay within the Airtable budget above (for example, server-rendered car pages that reuse the same hourly cached data, not a rebuild on every Airtable change).
2. Basic SEO: page titles, meta descriptions, sitemap, structured data for the dealer and each car.
3. Logo files: SVG and PNG, light and dark versions, favicon and app icon. (Done: Version B in brand/.)
4. Fill in the real dealer details in CONFIG once I send them.
