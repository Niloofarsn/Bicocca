const fs = require("fs");
const path = require("path");

// The bundled starting content (committed to the repo).
const SEED_FILE = path.join(__dirname, "..", "data", "content.json");
// Where live content is actually read/written. On a host with a persistent disk,
// set DATA_FILE to a path on that disk (e.g. /data/content.json) so edits survive.
const DATA_FILE = process.env.DATA_FILE || SEED_FILE;

let cache = null;

// On first run on a fresh disk, seed the data file from the bundled content.
function ensure() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const seed = fs.existsSync(SEED_FILE) ? fs.readFileSync(SEED_FILE, "utf8") : "{}";
    fs.writeFileSync(DATA_FILE, seed);
  }
}

function load() {
  if (!cache) {
    ensure();
    cache = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  }
  return cache;
}

function save(data) {
  cache = data;
  // Write atomically: write to a temp file, then rename over the original.
  const tmp = DATA_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// Collections are arrays of objects with an `id`.
function nextId(collection) {
  const items = load()[collection] || [];
  let max = 0;
  for (const it of items) {
    const n = parseInt(String(it.id).replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  const prefix = { programme: "p", participants: "u", abstracts: "a", practical: "x" }[collection] || "i";
  return prefix + (max + 1);
}

module.exports = { load, save, nextId, DATA_FILE };
