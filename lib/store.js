const fs = require("fs");
const path = require("path");

// The bundled starting content (committed to the repo). Used to seed an empty store.
const SEED_FILE = path.join(__dirname, "..", "data", "content.json");
// Local file used when not running on Vercel (so `npm start` works with no setup).
const DATA_FILE = process.env.DATA_FILE || SEED_FILE;

// On Vercel, BLOB_READ_WRITE_TOKEN is injected once a Blob store is connected.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_KEY = "content.json";

let cache = null;
let cacheAt = 0;
const TTL = 10000; // ms — bounds staleness across serverless instances (blob mode)

function readSeed() {
  return JSON.parse(fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, "utf8") : "{}");
}

async function load() {
  if (useBlob) {
    if (cache && Date.now() - cacheAt < TTL) return cache;
    try {
      const { list } = require("@vercel/blob");
      const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
      if (blobs && blobs.length) {
        const bust = blobs[0].url + (blobs[0].url.includes("?") ? "&" : "?") + "t=" + Date.now();
        const res = await fetch(bust, { cache: "no-store" });
        cache = await res.json();
      } else {
        cache = readSeed();
        await save(cache);
      }
    } catch (e) {
      // First run / transient error: fall back to the bundled seed.
      cache = readSeed();
    }
    cacheAt = Date.now();
    return cache;
  }

  // Local/file mode
  if (!cache) {
    ensureFile();
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
  return cache;
}

async function save(data) {
  cache = data;
  cacheAt = Date.now();
  if (useBlob) {
    const { put } = require("@vercel/blob");
    await put(BLOB_KEY, JSON.stringify(data, null, 2), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 0,
    });
    return;
  }
  ensureFile();
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
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
