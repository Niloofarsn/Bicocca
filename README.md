# Workshop in Harmonic Analysis — University of Milano-Bicocca

A small **self-hosted** bilingual (English / Italian) website with a built-in,
password-protected **admin panel**. No Netlify, no GitHub, no external CMS — it's a
single Node.js (Express) app that renders the pages and lets you edit everything live.

## Pages

- **Home** — poster, dates, brief description, organizers, contact, Bicocca-styled hero.
- **Programme** — three-day schedule + an **Abstracts** section (placeholder until you add any).
- **Participants** — speakers / organizers / participants.
- **Venue & Info** — venue + map, getting there, and practical items (hotels, dinners, transport).

Click **Admin** in the top navigation (or go to `/admin`) to edit any of it.

## Run it

```bash
npm install
npm start
```

Then open:
- Site:  http://localhost:3000/
- Admin: http://localhost:3000/admin

**Default admin password:** `1994` → change it (see below).

Editing in the admin saves instantly to `data/content.json` and shows on the site immediately —
no rebuild, no redeploy. Uploaded images go to `public/uploads/`.

## Configuration (environment variables)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ADMIN_PASSWORD` | The single admin login password | `1994` |
| `SESSION_SECRET` | Secret used to sign the login session cookie | `change-me-please` |
| `PORT` | Port to listen on | `3000` |

Example:

```bash
ADMIN_PASSWORD='choose-a-strong-one' SESSION_SECRET='some-long-random-string' npm start
```

## Deploy (any host that runs Node)

Because this is a normal Node server, it runs on a university server or any Node host
(Render, Railway, Fly.io, a VPS, etc.). General steps:

1. Copy the project to the server (or connect the host to a git repo if you have one).
2. Set the env vars above — **always set a real `ADMIN_PASSWORD` and `SESSION_SECRET`** in production.
3. `npm install --omit=dev` then `npm start` (ideally under a process manager like `pm2`,
   or the platform's own "Web Service" start command `node server.js`).
4. Put it behind HTTPS (the host usually provides this automatically).

### Example: Render
- New → **Web Service** → point it at the code.
- Build command: `npm install`   ·   Start command: `node server.js`
- Add environment variables `ADMIN_PASSWORD` and `SESSION_SECRET`.

> **Persistence note:** content lives in `data/content.json` and uploads in `public/uploads/`.
> On hosts with an *ephemeral* filesystem (e.g. Render's free tier resets on redeploy),
> attach a **persistent disk** mounted at the project folder (or at least at `data/` and
> `public/uploads/`) so edits survive restarts. On a university server or VPS this is automatic.

## Project structure

```
server.js            Express app: public routes + admin routes
lib/
  store.js           Loads/saves data/content.json (atomic write)
  schema.js          Field definitions that drive every admin form
  forms.js           Generic form render + parse
data/content.json    All site content (the "database")
views/               Nunjucks templates (public pages + admin)
public/css/          style.css (site) + admin.css (admin panel)
public/uploads/      Images uploaded via the admin
```

## Editing model

- **Pages & settings** (single forms): General information, Home page, Venue page,
  and **Page texts & labels** (every title, intro and heading, EN/IT).
- **Lists** (add / edit / delete): Programme sessions, Participants, Abstracts, Practical info.

Translatable fields show an **English** and an **Italian** box side by side.

## Notes

- The homepage shows an original Bicocca-denim motif until you upload a **poster**
  (Home page → Poster image), which then replaces it.
- To reset everything to the starting content, restore `data/content.json` from version control.
