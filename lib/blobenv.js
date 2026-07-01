// Finds the Vercel Blob token even if Vercel named it with a store prefix
// (e.g. MYSTORE_BLOB_READ_WRITE_TOKEN) instead of the default.
function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith("BLOB_READ_WRITE_TOKEN"));
  return key ? process.env[key] : null;
}

module.exports = {
  token,
  useBlob: () => !!token(),
  // Names only (never values) — safe to expose for diagnostics.
  blobEnvKeys: () => Object.keys(process.env).filter((k) => /BLOB/i.test(k)),
};
