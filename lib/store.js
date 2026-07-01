const fs = require("fs");
const path = require("path");

// The bundled starting content (committed to the repo). Used to seed an empty store.
const SEED_FILE = path.join(__dirname, "..", "data", "content.json");
// Local file used when not running on Vercel (so `npm start` works with no setup).
const DATA_FILE = process.env.DATA_FILE || SEED_FILE;

// On Vercel, BLOB_READ_WRITE_TOKEN is injected once a Blob store is connected.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const BLOB_KEY = "content.json";

let cache = null;      // file-mode cache
let blobUrl = null;    // discovered public URL of content.json (blob mode)
let lastGood = null;   // last good data, used as a fallback on transient errors

function readSeed() {
  return JSON.parse(fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, "utf8") : "{}");
}

async function discoverBlobUrl() {
  const { list } = require("@vercel/blob");
  const { blobs } = await list({ prefix: BLOB_KEY, limit: 1 });
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
    return cache;
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
    return data;
  } catch (e) {
    console.error("store.load (blob) error:", e.message);
    return lastGood || readSeed();
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
  const { put, del } = require("@vercel/blob");
  // This @vercel/blob version can't overwrite an existing blob, so remove the
  // old content.json first (ignore if it isn't there), then write the new one.
  if (!blobUrl) {
    try { await discoverBlobUrl(); } catch (e) {}
  }
  if (blobUrl) {
    try { await del(blobUrl); } catch (e) {}
  }
  const r = await put(BLOB_KEY, JSON.stringify(data, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    cacheControlMaxAge: 0,
  });
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
