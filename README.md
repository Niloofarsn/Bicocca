# Workshop in Harmonic Analysis — University of Milano-Bicocca

Bilingual (English / Italian) website for the workshop, built as a static site with
[Eleventy](https://www.11ty.dev/) and an admin panel powered by
[Decap CMS](https://decapcms.org/) (the maintained successor to Netlify CMS).

## Pages

- **Home** — poster, dates, brief description, organizers, contact, Bicocca-styled hero.
- **Programme** — three-day schedule (editable) + an **Abstracts** section (placeholder now).
- **Participants** — list of speakers / organizers / participants.
- **Venue & Info** — venue + map, getting there, and practical items (hotels, dinners, transport).

Everything visible on the site is editable from the admin panel at `/admin`.

## Run locally

```bash
npm install
npm start            # serves the site at http://localhost:8080
```

### Edit content locally (no account needed)

In a second terminal:

```bash
npm run cms          # starts the Decap local backend
```

Then open <http://localhost:8080/admin/>. Because `local_backend: true` is set in
`src/admin/config.yml`, edits are written straight to the files in `src/` — refresh the
site to see them. (No login is required in local mode.)

## Deploy on Netlify (with the live admin panel)

1. Push this folder to a GitHub repository.
2. In Netlify: **Add new site → Import from Git**, pick the repo. Build settings are read
   from `netlify.toml` (build `npm run build`, publish `_site`).
3. Enable **Identity**: *Site settings → Identity → Enable Identity*.
4. Under Identity → **Registration**, set it to **Invite only**.
5. Enable **Git Gateway**: *Identity → Services → Enable Git Gateway*.
6. **Invite yourself**: Identity → *Invite users* → enter the organizer email. Accept the
   email invite, set a password — that single login is your admin access.
7. Log in at `https://<your-site>/admin/`, edit content, and Save/Publish. Each change
   commits to GitHub and Netlify rebuilds automatically.

> If your default branch is not `main`, update `backend.branch` in `src/admin/config.yml`.

## Content structure

| What | Where | Edited as |
|------|-------|-----------|
| Title, dates, organizers, contact | `src/_data/site.json` | Settings → General |
| Home poster & description | `src/_data/home.json` | Settings → Home page |
| Venue & getting there | `src/_data/venue.json` | Settings → Venue page |
| Programme sessions | `src/programme/*.md` | Programme |
| Participants | `src/participants/*.md` | Participants |
| Abstracts (placeholder) | `src/abstracts/*.md` | Abstracts |
| Hotels / dinners / transport | `src/practical/*.md` | Practical info |

Translatable fields appear twice in the admin (English / Italian).

## Notes

- The homepage shows an original Bicocca-denim motif until you upload the real **poster**
  (Settings → Home page → Poster image). The official university logo is intentionally not
  bundled.
- UI labels (nav, section headings) live in `src/_data/i18n.json`.
