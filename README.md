# Workshop in Harmonic Analysis — University of Milano-Bicocca

A bilingual (English / Italian) website with a built-in, password-protected **admin panel**.
It's a single Node.js (Express) app that renders the pages and lets you edit everything live.
It runs **for free on Vercel** (using Vercel Blob to store content + photos), and also runs
locally with plain files — no setup — for editing on your own computer.

## Pages

- **Home** — photo, dates, brief description, organizers, contact, Bicocca-styled hero.
- **Programme** — three-day schedule + an **Abstracts** section (placeholder until you add any).
- **Participants** — speakers / organizers / participants.
- **Venue & Info** — venue + map, getting there, and practical items (hotels, dinners, transport).

Click **Admin** in the top navigation (or go to `/admin`) to edit any of it.

## Run locally

```bash
npm install
npm start
```

- Site:  http://localhost:3000/
- Admin: http://localhost:3000/admin   (default password `1994`)

Locally, edits save to `data/content.json` and uploads to `public/uploads/`.

## Deploy free on Vercel

1. **Create a Vercel account** at https://vercel.com → "Continue with GitHub".
2. **Add New… → Project**, import the GitHub repo (`Niloofarsn/Bicocca`).
   Vercel reads `vercel.json` automatically — just click **Deploy**.
3. **Add a Blob store** (this is what makes saving persist):
   *Project → Storage → Create → Blob → Connect.*
   Vercel automatically adds the `BLOB_READ_WRITE_TOKEN` environment variable.
4. **Set your admin login** under *Project → Settings → Environment Variables*:
   - `ADMIN_PASSWORD` = a strong password
   - `SESSION_SECRET` = any long random string
5. **Redeploy** (*Deployments → ⋯ → Redeploy*) so the new variables take effect.

You'll get a public URL like `https://bicocca.vercel.app` — that's the link you share.
Log in at `/admin`, and every edit is saved to Blob and shown on the site.

> The first content load creates `content.json` in Blob from the bundled starting content.
> After that, all edits and uploaded photos live in Blob and persist across deployments.

## Configuration (environment variables)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ADMIN_PASSWORD` | The single admin login password | `1994` (change in production!) |
| `SESSION_SECRET` | Secret used to sign the login session cookie | `change-me-please` |
| `BLOB_READ_WRITE_TOKEN` | Set automatically when you connect a Vercel Blob store | — |
| `PORT` | Local port | `3000` |

If `BLOB_READ_WRITE_TOKEN` is present (on Vercel) the app uses Blob storage; otherwise it
uses local files (your computer).

## Project structure

```
server.js            Express app (exported for Vercel, listens locally)
api/index.js         Vercel serverless entry (imports the app)
vercel.json          Routes all requests to the app; bundles views/public/data
lib/
  store.js           Loads/saves content (Vercel Blob or local file)
  uploads.js         Saves images (Vercel Blob or public/uploads)
  schema.js          Field definitions that drive every admin form
  forms.js           Generic form render + parse
data/content.json    Starting content (seed) + local data store
views/               Nunjucks templates (public pages + admin)
public/css/          style.css (site) + admin.css (admin panel)
```

## Editing model

- **Pages & settings:** Home page (incl. the changeable photo), Venue page, and
  **Page texts & labels** (every title, intro and heading, EN/IT).
- **Lists:** Programme sessions, Participants, Abstracts, Practical info — add / edit / delete.

Translatable fields show an **English** and an **Italian** box side by side.

## Notes

- The homepage shows an original Bicocca-denim motif until you upload a **photo**
  (Home page → Homepage photo), which then replaces it. A checkbox removes it again.
- On Vercel's free tier the site may take a few seconds to "wake up" on the first visit
  after a long idle period, then it's fast.
