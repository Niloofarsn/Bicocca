// Generic rendering and parsing of admin forms from the schema field definitions.

function getPath(obj, pathStr) {
  return String(pathStr).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setPath(obj, pathStr, value) {
  const keys = String(pathStr).split(".");
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== "object") o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Render one field as an HTML form-group. `obj` is the data object being edited.
function renderField(field, obj) {
  if (field.group) {
    return `<h3 class="form-group-title">${esc(field.group)}</h3>`;
  }
  const name = field.name;
  const id = "f_" + name.replace(/[^a-z0-9]/gi, "_");
  const hint = field.hint ? `<span class="hint">${esc(field.hint)}</span>` : "";
  const req = field.required ? " required" : "";
  let control = "";

  switch (field.type) {
    case "text":
    case "url": {
      const v = esc(getPath(obj, name));
      control = `<input type="text" id="${id}" name="${esc(name)}" value="${v}"${req} />`;
      break;
    }
    case "number": {
      const v = getPath(obj, name);
      const min = field.min != null ? ` min="${field.min}"` : "";
      const max = field.max != null ? ` max="${field.max}"` : "";
      control = `<input type="number" id="${id}" name="${esc(name)}" value="${esc(v == null ? (field.default ?? "") : v)}"${min}${max} />`;
      break;
    }
    case "textarea": {
      control = `<textarea id="${id}" name="${esc(name)}" rows="4">${esc(getPath(obj, name))}</textarea>`;
      break;
    }
    case "markdown": {
      control = `<textarea id="${id}" name="${esc(name)}" rows="6" class="mono">${esc(getPath(obj, name))}</textarea><span class="hint">Markdown supported.</span>`;
      break;
    }
    case "select": {
      const v = getPath(obj, name) ?? field.default;
      const opts = field.options
        .map((o) => `<option value="${esc(o.value)}"${o.value === v ? " selected" : ""}>${esc(o.label)}</option>`)
        .join("");
      control = `<select id="${id}" name="${esc(name)}">${opts}</select>`;
      break;
    }
    case "image": {
      const v = getPath(obj, name);
      const current = v
        ? `<div class="img-current"><img src="${esc(v)}" alt="" /><span class="hint">Current photo: ${esc(v)}</span></div>
           <label class="checkline"><input type="checkbox" name="${esc(name)}__remove" value="1" /> Remove current photo (show the default Bicocca motif instead)</label>`
        : "";
      control = `${current}<input type="file" id="${id}" name="${esc(name)}" accept="image/*" /><span class="hint">Choose an image to ${v ? "replace" : "set"} the homepage photo.</span>`;
      break;
    }
    case "file": {
      const v = getPath(obj, name);
      const current = v
        ? `<div class="file-current"><a href="${esc(v)}" target="_blank" rel="noopener">📄 Current file ↗</a>
           <label class="checkline"><input type="checkbox" name="${esc(name)}__remove" value="1" /> Remove file</label></div>`
        : "";
      control = `${current}<input type="file" id="${id}" name="${esc(name)}" accept="application/pdf,.pdf" /><span class="hint">Upload a PDF (max 25 MB).</span>`;
      break;
    }
    case "i18n":
    case "i18ntext": {
      const val = getPath(obj, name) || {};
      const tag = field.type === "i18ntext"
        ? (lang, v) => `<textarea name="${esc(name)}.${lang}" rows="3">${esc(v)}</textarea>`
        : (lang, v) => `<input type="text" name="${esc(name)}.${lang}" value="${esc(v)}" />`;
      control = `<div class="i18n-pair">
        <label class="sub">English${tag("en", val.en)}</label>
        <label class="sub">Italiano${tag("it", val.it)}</label>
      </div>`;
      break;
    }
    case "i18nmd": {
      const en = esc(getPath(obj, name + "_en"));
      const it = esc(getPath(obj, name + "_it"));
      control = `<div class="i18n-pair">
        <label class="sub">English (markdown)<textarea name="${esc(name)}_en" rows="6" class="mono">${en}</textarea></label>
        <label class="sub">Italiano (markdown)<textarea name="${esc(name)}_it" rows="6" class="mono">${it}</textarea></label>
      </div>`;
      break;
    }
    case "stringlist": {
      const arr = getPath(obj, name) || [];
      control = `<textarea id="${id}" name="${esc(name)}" rows="3">${esc(arr.join("\n"))}</textarea><span class="hint">One per line.</span>`;
      break;
    }
    case "objlist": {
      const arr = getPath(obj, name) || [];
      const keys = field.subfields.map((s) => s.name);
      const lines = arr.map((o) => keys.map((k) => o[k] || "").join(" :: ")).join("\n");
      const cols = field.subfields.map((s) => s.label).join(" :: ");
      control = `<textarea id="${id}" name="${esc(name)}" rows="4">${esc(lines)}</textarea><span class="hint">One per line, fields separated by " :: " — order: ${esc(cols)}</span>`;
      break;
    }
    default:
      control = `<em>Unsupported field: ${esc(field.type)}</em>`;
  }

  return `<div class="form-row"><label for="${id}">${esc(field.label)}</label>${control}${hint}</div>`;
}

// Apply submitted form data onto the data object.
// `uploads` is an array of already-saved files: { fieldname, url }.
function applyForm(fields, body, uploads, obj) {
  const fileByName = {};
  (uploads || []).forEach((f) => { fileByName[f.fieldname] = f; });

  for (const field of fields) {
    if (field.group) continue;
    const name = field.name;
    switch (field.type) {
      case "text":
      case "url":
      case "textarea":
      case "markdown":
      case "select":
        setPath(obj, name, body[name] != null ? String(body[name]) : "");
        break;
      case "number": {
        const n = parseInt(body[name], 10);
        setPath(obj, name, isNaN(n) ? (field.default ?? 0) : n);
        break;
      }
      case "i18n":
      case "i18ntext":
        setPath(obj, name, { en: String(body[name + ".en"] || ""), it: String(body[name + ".it"] || "") });
        break;
      case "i18nmd":
        setPath(obj, name + "_en", String(body[name + "_en"] || ""));
        setPath(obj, name + "_it", String(body[name + "_it"] || ""));
        break;
      case "image":
      case "file": {
        const f = fileByName[name];
        if (f) setPath(obj, name, f.url);
        else if (body[name + "__remove"]) setPath(obj, name, "");
        // otherwise keep the existing value
        break;
      }
      case "stringlist":
        setPath(obj, name, String(body[name] || "").split("\n").map((s) => s.trim()).filter(Boolean));
        break;
      case "objlist": {
        const keys = field.subfields.map((s) => s.name);
        const rows = String(body[name] || "")
          .split("\n").map((l) => l.trim()).filter(Boolean)
          .map((line) => {
            const parts = line.split("::").map((p) => p.trim());
            const o = {};
            keys.forEach((k, i) => { o[k] = parts[i] || ""; });
            return o;
          });
        setPath(obj, name, rows);
        break;
      }
    }
  }
  return obj;
}

module.exports = { getPath, setPath, renderField, applyForm, esc };
