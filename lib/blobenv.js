// Vercel Blob auth. The modern (connected) store authenticates automatically via
// the Vercel platform (BLOB_STORE_ID + system OIDC), so a read-write token is
// optional. We still support an explicit token for older setups / local use.

function token() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  const key = Object.keys(process.env).find((k) => k.endsWith("BLOB_READ_WRITE_TOKEN"));
  return key ? process.env[key] : null;
}

function storeId() {
  if (process.env.BLOB_STORE_ID) return process.env.BLOB_STORE_ID;
  const key = Object.keys(process.env).find((k) => k.endsWith("BLOB_STORE_ID"));
  return key ? process.env[key] : null;
}

// In Blob mode when either a token or a connected store is present.
function useBlob() {
  return !!(token() || storeId());
}

// Options to merge into every @vercel/blob call. Includes the token only when
// one exists; otherwise the SDK uses automatic (platform) authentication.
function authOpts() {
  const t = token();
  return t ? { token: t } : {};
}

module.exports = {
  token,
  storeId,
  useBlob,
  authOpts,
  blobEnvKeys: () => Object.keys(process.env).filter((k) => /BLOB/i.test(k)),
};
