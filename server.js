const path = require("path");
const express = require("express");
const cookieSession = require("cookie-session");
const multer = require("multer");
const nunjucks = require("nunjucks");
const markdownIt = require("markdown-it");

const store = require("./lib/store");
const schema = require("./lib/schema");
const { saveUpload, localDir } = require("./lib/uploads");
const { renderField, applyForm } = require("./lib/forms");

const app = express();
app.set("trust proxy", 1); // behind a hosting proxy (Vercel/etc.) for correct HTTPS handling
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1994";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-please";

// Wrap async route handlers so rejections reach Express' error handler.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Views ----------
const env = nunjucks.configure(path.join(__dirname, "views"), {
  autoescape: true,
  express: app,
  noCache: process.env.NODE_ENV !== "production",
});
const md = markdownIt({ html: true, breaks: true, linkify: true });
env.addFilter("loc", (v, locale) => {
  if (v == null) return "";
  if (typeof v === "object") return v[locale] || v.en || "";
  return v;
});
env.addFilter("md", (s) => (s ? md.render(String(s)) : ""));

// ---------- Middleware ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(localDir)); // local uploads (no effect in Blob mode)
app.use(
  cookieSession({
    name: "sess",
    secret: SESSION_SECRET,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    httpOnly: true,
    sameSite: "lax",
  })
);

// Images are held in memory, then handed to saveUpload (Blob or disk).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

async function handleUploads(req) {
  const out = [];
  for (const f of req.files || []) out.push({ fieldname: f.fieldname, url: await saveUpload(f) });
  return out;
}

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.redirect("/admin/login");
}

function publicCtx(locale, data, extra) {
  const otherLocale = locale === "en" ? "it" : "en";
  return Object.assign({ locale, otherLocale, site: data.site, L: data.labels }, extra);
}

// ================= PUBLIC SITE =================
app.get("/", (req, res) => res.redirect("/en/"));

app.get("/:locale(en|it)/", ah(async (req, res) => {
  const data = await store.load();
  res.render("home.njk", publicCtx(req.params.locale, data, { page: "home", home: data.home }));
}));

app.get("/:locale(en|it)/programme/", ah(async (req, res) => {
  const data = await store.load();
  const days = [1, 2, 3].map((d) => ({
    n: d,
    sessions: data.programme
      .filter((s) => Number(s.day) === d)
      .sort((a, b) => String(a.start || "").localeCompare(String(b.start || ""))),
  }));
  res.render("programme.njk", publicCtx(req.params.locale, data, { page: "programme", days, abstracts: data.abstracts }));
}));

app.get("/:locale(en|it)/participants/", ah(async (req, res) => {
  const data = await store.load();
  const people = [...data.participants].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  res.render("participants.njk", publicCtx(req.params.locale, data, { page: "participants", people }));
}));

app.get("/:locale(en|it)/venue/", ah(async (req, res) => {
  const data = await store.load();
  const cats = ["hotel", "dinner", "transport", "other"].map((c) => ({
    key: c,
    items: data.practical.filter((p) => p.category === c).sort((a, b) => (a.order || 0) - (b.order || 0)),
  })).filter((c) => c.items.length);
  res.render("venue.njk", publicCtx(req.params.locale, data, { page: "venue", venue: data.venue, cats }));
}));

// ================= ADMIN =================
app.get("/admin/login", (req, res) => res.render("admin/login.njk", { error: null }));

app.post("/admin/login", (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authed = true;
    return res.redirect("/admin");
  }
  res.status(401).render("admin/login.njk", { error: "Incorrect password." });
});

app.post("/admin/logout", (req, res) => {
  req.session = null;
  res.redirect("/admin/login");
});

app.get("/admin", requireAuth, (req, res) => {
  res.render("admin/dashboard.njk", {
    singletons: Object.values(schema.singletons),
    collections: Object.values(schema.collections),
  });
});

// ----- Singletons -----
app.get("/admin/edit/:key", requireAuth, ah(async (req, res) => {
  const def = schema.singletons[req.params.key];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const target = def.root ? data : data[def.key];
  const fieldsHtml = def.fields.map((f) => renderField(f, target)).join("\n");
  res.render("admin/form.njk", { heading: def.label, action: `/admin/edit/${def.key}`, fieldsHtml, deleteAction: null, backUrl: "/admin" });
}));

app.post("/admin/edit/:key", requireAuth, upload.any(), ah(async (req, res) => {
  const def = schema.singletons[req.params.key];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const target = def.root ? data : data[def.key];
  const uploads = await handleUploads(req);
  applyForm(def.fields, req.body, uploads, target);
  await store.save(data);
  res.redirect("/admin/edit/" + def.key + "?saved=1");
}));

// ----- Collections -----
app.get("/admin/c/:col", requireAuth, ah(async (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const items = data[def.key].map((it) => ({ id: it.id, summary: def.summary(it) }));
  res.render("admin/collection.njk", { def, items });
}));

app.get("/admin/c/:col/new", requireAuth, (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const fieldsHtml = def.fields.map((f) => renderField(f, {})).join("\n");
  res.render("admin/form.njk", { heading: "New " + def.singular, action: `/admin/c/${def.key}/new`, fieldsHtml, deleteAction: null, backUrl: `/admin/c/${def.key}` });
});

app.post("/admin/c/:col/new", requireAuth, upload.any(), ah(async (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const item = { id: store.nextId(data, def.key) };
  const uploads = await handleUploads(req);
  applyForm(def.fields, req.body, uploads, item);
  data[def.key].push(item);
  await store.save(data);
  res.redirect(`/admin/c/${def.key}`);
}));

app.get("/admin/c/:col/:id", requireAuth, ah(async (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const item = data[def.key].find((x) => x.id === req.params.id);
  if (!item) return res.redirect(`/admin/c/${def.key}`);
  const fieldsHtml = def.fields.map((f) => renderField(f, item)).join("\n");
  res.render("admin/form.njk", { heading: "Edit " + def.singular, action: `/admin/c/${def.key}/${item.id}`, fieldsHtml, deleteAction: `/admin/c/${def.key}/${item.id}/delete`, backUrl: `/admin/c/${def.key}` });
}));

app.post("/admin/c/:col/:id", requireAuth, upload.any(), ah(async (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  const item = data[def.key].find((x) => x.id === req.params.id);
  if (!item) return res.redirect(`/admin/c/${def.key}`);
  const uploads = await handleUploads(req);
  applyForm(def.fields, req.body, uploads, item);
  await store.save(data);
  res.redirect(`/admin/c/${def.key}`);
}));

app.post("/admin/c/:col/:id/delete", requireAuth, ah(async (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = await store.load();
  data[def.key] = data[def.key].filter((x) => x.id !== req.params.id);
  await store.save(data);
  res.redirect(`/admin/c/${def.key}`);
}));

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Server error. Please try again.");
});

// Only start a listener when run directly (local). On Vercel the app is imported.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Harmonic Analysis @ Bicocca`);
    console.log(`  Site  : http://localhost:${PORT}/`);
    console.log(`  Admin : http://localhost:${PORT}/admin   (password: ${ADMIN_PASSWORD})\n`);
  });
}

module.exports = app;
