const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  const md = markdownIt({ html: true, breaks: true, linkify: true });

  // Static assets and the admin (Decap CMS) panel are copied verbatim.
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });
  eleventyConfig.addPassthroughCopy({ "src/admin": "admin" });

  // Pick a localized value from a {en, it} object (falls back to English).
  eleventyConfig.addFilter("loc", (value, locale) => {
    if (value == null) return "";
    if (typeof value === "object") return value[locale] || value.en || "";
    return value;
  });

  // Filter an array by a (possibly nested, dotted) key matching a value.
  eleventyConfig.addFilter("where", (arr, key, value) =>
    (arr || []).filter((item) => {
      const v = String(key)
        .split(".")
        .reduce((o, k) => (o == null ? undefined : o[k]), item);
      return v === value;
    })
  );

  // Render a markdown string to HTML (used for bilingual rich-text fields).
  eleventyConfig.addFilter("md", (str) => (str ? md.render(String(str)) : ""));
  eleventyConfig.addFilter("mdInline", (str) =>
    str ? md.renderInline(String(str)) : ""
  );

  // Programme sessions, grouped/sorted by day then start time.
  eleventyConfig.addCollection("programme", (api) =>
    api.getFilteredByTag("programme").sort((a, b) => {
      const byDay = (a.data.day || 0) - (b.data.day || 0);
      if (byDay) return byDay;
      return String(a.data.start || "").localeCompare(String(b.data.start || ""));
    })
  );

  // Participants, sorted alphabetically by family name where possible.
  eleventyConfig.addCollection("participants", (api) =>
    api.getFilteredByTag("participants").sort((a, b) =>
      String(a.data.name || "").localeCompare(String(b.data.name || ""))
    )
  );

  // Abstracts (empty placeholder collection initially).
  eleventyConfig.addCollection("abstracts", (api) =>
    api.getFilteredByTag("abstracts").sort((a, b) =>
      String(a.data.speaker || "").localeCompare(String(b.data.speaker || ""))
    )
  );

  // Practical info items (hotels, dinners, transport...).
  eleventyConfig.addCollection("practical", (api) =>
    api.getFilteredByTag("practical").sort((a, b) =>
      (a.data.order || 0) - (b.data.order || 0)
    )
  );

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
