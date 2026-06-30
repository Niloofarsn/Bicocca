const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const nunjucks = require("nunjucks");
const markdownIt = require("markdown-it");

const store = require("./lib/store");
const schema = require("./lib/schema");
const { renderField, applyForm } = require("./lib/forms");

const app = express();
app.set("trust proxy", 1); // behind a hosting proxy (Render/etc.) for correct HTTPS handling
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "1994";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me-please";
const LOCALES = ["en", "it"];

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
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
  })
);

// Uploads live here. On a host with a persistent disk, set UPLOAD_DIR to a path
// on that disk (e.g. /data/uploads) so uploaded photos survive restarts.
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, "_");
      cb(null, Date.now() + "-" + safe);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
});

function requireAuth(req, res, next) {
  if (req.session && req.session.authed) return next();
  return res.redirect("/admin/login");
}

// Common context for public pages.
function publicCtx(locale, extra) {
  const data = store.load();
  const otherLocale = locale === "en" ? "it" : "en";
  return Object.assign(
    { locale, otherLocale, site: data.site, L: data.labels },
    extra
  );
}

// ================= PUBLIC SITE =================
app.get("/", (req, res) => res.redirect("/en/"));

app.get("/:locale(en|it)/", (req, res) => {
  const data = store.load();
  res.render("home.njk", publicCtx(req.params.locale, { page: "home", home: data.home }));
});

app.get("/:locale(en|it)/programme/", (req, res) => {
  const data = store.load();
  const days = [1, 2, 3].map((d) => ({
    n: d,
    sessions: data.programme
      .filter((s) => Number(s.day) === d)
      .sort((a, b) => String(a.start || "").localeCompare(String(b.start || ""))),
  }));
  res.render("programme.njk", publicCtx(req.params.locale, { page: "programme", days, abstracts: data.abstracts }));
});

app.get("/:locale(en|it)/participants/", (req, res) => {
  const data = store.load();
  const people = [...data.participants].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  res.render("participants.njk", publicCtx(req.params.locale, { page: "participants", people }));
});

app.get("/:locale(en|it)/venue/", (req, res) => {
  const data = store.load();
  const cats = ["hotel", "dinner", "transport", "other"].map((c) => ({
    key: c,
    items: data.practical
      .filter((p) => p.category === c)
      .sort((a, b) => (a.order || 0) - (b.order || 0)),
  })).filter((c) => c.items.length);
  res.render("venue.njk", publicCtx(req.params.locale, { page: "venue", venue: data.venue, cats }));
});

// ================= ADMIN =================
app.get("/admin/login", (req, res) => {
  res.render("admin/login.njk", { error: null });
});

app.post("/admin/login", upload.none(), (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) {
    req.session.authed = true;
    return res.redirect("/admin");
  }
  res.status(401).render("admin/login.njk", { error: "Incorrect password." });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

app.get("/admin", requireAuth, (req, res) => {
  res.render("admin/dashboard.njk", {
    singletons: Object.values(schema.singletons),
    collections: Object.values(schema.collections),
  });
});

// ----- Singletons -----
app.get("/admin/edit/:key", requireAuth, (req, res) => {
  const def = schema.singletons[req.params.key];
  if (!def) return res.redirect("/admin");
  const data = store.load();
  const target = def.root ? data : data[def.key];
  const fieldsHtml = def.fields.map((f) => renderField(f, target)).join("\n");
  res.render("admin/form.njk", {
    heading: def.label,
    action: `/admin/edit/${def.key}`,
    fieldsHtml,
    deleteAction: null,
    backUrl: "/admin",
  });
});

app.post("/admin/edit/:key", requireAuth, upload.any(), (req, res) => {
  const def = schema.singletons[req.params.key];
  if (!def) return res.redirect("/admin");
  const data = store.load();
  const target = def.root ? data : data[def.key];
  applyForm(def.fields, req.body, req.files, target);
  store.save(data);
  res.redirect("/admin/edit/" + def.key + "?saved=1");
});

// ----- Collections -----
app.get("/admin/c/:col", requireAuth, (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const items = store.load()[def.key].map((it) => ({ id: it.id, summary: def.summary(it) }));
  res.render("admin/collection.njk", { def, items });
});

app.get("/admin/c/:col/new", requireAuth, (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const blank = {};
  const fieldsHtml = def.fields.map((f) => renderField(f, blank)).join("\n");
  res.render("admin/form.njk", {
    heading: "New " + def.singular,
    action: `/admin/c/${def.key}/new`,
    fieldsHtml,
    deleteAction: null,
    backUrl: `/admin/c/${def.key}`,
  });
});

app.post("/admin/c/:col/new", requireAuth, upload.any(), (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = store.load();
  const item = { id: store.nextId(def.key) };
  applyForm(def.fields, req.body, req.files, item);
  data[def.key].push(item);
  store.save(data);
  res.redirect(`/admin/c/${def.key}`);
});

app.get("/admin/c/:col/:id", requireAuth, (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const item = store.load()[def.key].find((x) => x.id === req.params.id);
  if (!item) return res.redirect(`/admin/c/${def.key}`);
  const fieldsHtml = def.fields.map((f) => renderField(f, item)).join("\n");
  res.render("admin/form.njk", {
    heading: "Edit " + def.singular,
    action: `/admin/c/${def.key}/${item.id}`,
    fieldsHtml,
    deleteAction: `/admin/c/${def.key}/${item.id}/delete`,
    backUrl: `/admin/c/${def.key}`,
  });
});

app.post("/admin/c/:col/:id", requireAuth, upload.any(), (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = store.load();
  const item = data[def.key].find((x) => x.id === req.params.id);
  if (!item) return res.redirect(`/admin/c/${def.key}`);
  applyForm(def.fields, req.body, req.files, item);
  store.save(data);
  res.redirect(`/admin/c/${def.key}`);
});

app.post("/admin/c/:col/:id/delete", requireAuth, upload.none(), (req, res) => {
  const def = schema.collections[req.params.col];
  if (!def) return res.redirect("/admin");
  const data = store.load();
  data[def.key] = data[def.key].filter((x) => x.id !== req.params.id);
  store.save(data);
  res.redirect(`/admin/c/${def.key}`);
});

app.listen(PORT, () => {
  console.log(`\n  Harmonic Analysis @ Bicocca`);
  console.log(`  Site  : http://localhost:${PORT}/`);
  console.log(`  Admin : http://localhost:${PORT}/admin   (password: ${ADMIN_PASSWORD})\n`);
});
