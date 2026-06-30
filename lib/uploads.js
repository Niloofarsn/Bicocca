const fs = require("fs");
const path = require("path");

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const localDir = process.env.UPLOAD_DIR || path.join(__dirname, "..", "public", "uploads");

// Save an uploaded file (multer memory-storage object) and return a public URL.
// On Vercel -> Vercel Blob (absolute URL). Locally -> public/uploads (/uploads/...).
async function saveUpload(file) {
  const safe = (file.originalname || "upload").replace(/[^a-z0-9.\-_]/gi, "_");
  const name = Date.now() + "-" + safe;
  if (useBlob) {
    const { put } = require("@vercel/blob");
    const res = await put("uploads/" + name, file.buffer, {
      access: "public",
      contentType: file.mimetype,
    });
    return res.url;
  }
  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, name), file.buffer);
  return "/uploads/" + name;
}

module.exports = { saveUpload, localDir };
