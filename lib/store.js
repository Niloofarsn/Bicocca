const fs = require("fs");
const path = require("path");

// The bundled starting content (committed to the repo). Used to seed an empty store.
const SEED_FILE = path.join(__dirname, "..", "data", "content.json");
// Local file used when not running on Vercel (so `npm start` works with no setup).
const DATA_FILE = process.env.DATA_FILE || SEED_FILE;

// On Vercel, a Blob token is injected once a Blob store is connected.
const blobenv = require("./blobenv");
const useBlob = blobenv.useBlob();
const BLOB_KEY = "content.json";

let cache = null;      // file-mode cache
let blobUrl = null;    // discovered public URL of content.json (blob mode)
let lastGood = null;   // last good data, used as a fallback on transient errors

function readSeed() {
  return JSON.parse(fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, "utf8") : "{}");
}

// Fill in any keys missing from stored data using the seed as defaults, so newly
// added fields (e.g. a registration link) appear without needing a manual re-save.
// Existing values — including arrays like participants — are always kept as-is.
function withDefaults(obj) {
  const merge = (def, val) => {
    if (def === null || typeof def !== "object" || Array.isArray(def)) {
      return val === undefined ? def : val;
    }
    if (val === null || typeof val !== "object" || Array.isArray(val)) {
      return val === undefined ? def : val;
    }
    const out = Object.assign({}, val);
    for (const k of Object.keys(def)) out[k] = merge(def[k], val[k]);
    return out;
  };
  return merge(readSeed(), obj);
}

async function discoverBlobUrl() {
  const { list } = require("@vercel/blob");
  const { blobs } = await list(Object.assign({ prefix: BLOB_KEY, limit: 1 }, blobenv.authOpts()));
  if (blobs && blobs.length) {
    blobUrl = blobs[0].url;
    return true;
  }
  return false;
}

async function load() {
  if (!useBlob) {
    if (!cache) {
      ensureFile();
      cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    }
    return withDefaults(cache);
  }

  // Blob mode: always read the freshest content so edits show immediately.
  try {
    if (!blobUrl) {
      const found = await discoverBlobUrl();
      if (!found) {
        const seed = readSeed();
        await save(seed); // creates content.json and sets blobUrl
        return seed;
      }
    }
    const bust = blobUrl + (blobUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
    const res = await fetch(bust, { cache: "no-store" });
    if (!res.ok) throw new Error("blob fetch " + res.status);
    const data = await res.json();
    lastGood = data;
    return withDefaults(data);
  } catch (e) {
    console.error("store.load (blob) error:", e.message);
    return withDefaults(lastGood || readSeed());
  }
}

async function save(data) {
  if (!useBlob) {
    cache = data;
    ensureFile();
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, DATA_FILE);
    return;
  }
  const { put } = require("@vercel/blob");
  const r = await put(
    BLOB_KEY,
    JSON.stringify(data, null, 2),
    Object.assign(
      {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 0,
      },
      blobenv.authOpts()
    )
  );
  blobUrl = r.url;
  lastGood = data;
}

function ensureFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(readSeed(), null, 2));
  }
}

// Collections are arrays of objects with an `id`. Compute the next id from loaded data.
function nextId(data, collection) {
  const items = data[collection] || [];
  let max = 0;
  for (const it of items) {
    const n = parseInt(String(it.id).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const prefix = { programme: "p", participants: "u", abstracts: "a", practical: "x" }[collection] || "i";
  return prefix + (max + 1);
}

module.exports = { load, save, nextId };
