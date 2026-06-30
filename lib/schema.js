// Field-type vocabulary used by the generic admin form renderer/parser:
//   text, textarea, number, url            -> plain value at obj[name]
//   select                                 -> plain value, with options[]
//   markdown                               -> plain string (rendered as markdown on the site)
//   image                                  -> file upload, stores a path string at obj[name]
//   i18n                                   -> { en, it } object at obj[name]  (single line)
//   i18ntext                               -> { en, it } object, multi-line
//   i18nmd                                 -> markdown stored at obj[name+'_en'] / obj[name+'_it']
//   stringlist                             -> array of strings
//   objlist                                -> array of objects, with subfields[]
// Dotted names (e.g. "nav.home") address nested objects (used for labels).

const TALK_TYPES = [
  { value: "talk", label: "Talk" },
  { value: "break", label: "Break" },
  { value: "lunch", label: "Lunch" },
  { value: "registration", label: "Registration" },
];

const ROLES = [
  { value: "speaker", label: "Speaker" },
  { value: "organizer", label: "Organizer" },
  { value: "participant", label: "Participant" },
];

const CATEGORIES = [
  { value: "hotel", label: "Accommodation" },
  { value: "dinner", label: "Dinners & food" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

// ---- Single-instance sections ----
// The Home page form is `root: true`: its fields use dotted names addressing the
// whole data object, so everything shown on the homepage is edited in one place.
const singletons = {
  home: {
    label: "Home page",
    key: "home",
    root: true,
    fields: [
      { group: "Hero (top of the homepage)" },
      { name: "site.title", label: "Workshop title", type: "i18n" },
      { name: "site.dates", label: "Dates", type: "i18n" },
      { name: "site.location", label: "Location (small line above the title)", type: "i18n" },
      { name: "site.tagline", label: "Tagline (short sentence under the dates)", type: "i18ntext" },
      { group: "Homepage photo" },
      { name: "home.poster", label: "Homepage photo", type: "image" },
      { name: "home.posterAlt", label: "Photo description (alt text)", type: "i18n" },
      { group: "About section" },
      { name: "home.description", label: "About text", type: "i18nmd" },
      { group: "Organizers & contact (shown on the homepage)" },
      {
        name: "site.organizers",
        label: "Organizers",
        type: "objlist",
        subfields: [
          { name: "name", label: "Name", type: "text" },
          { name: "affiliation", label: "Affiliation", type: "text" },
        ],
      },
      { name: "site.contactEmails", label: "Contact emails", type: "stringlist" },
      { group: "Site-wide" },
      { name: "site.shortTitle", label: "Short title (browser tab & header brand)", type: "text" },
    ],
  },

  venue: {
    label: "Venue page",
    key: "venue",
    fields: [
      { name: "venueName", label: "Venue name", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "room", label: "Room", type: "i18n" },
      { name: "mapEmbed", label: "Map embed URL (iframe src)", type: "text" },
      { name: "mapLink", label: "Map link (opens in maps)", type: "text" },
      { name: "gettingThere", label: "Getting there", type: "i18nmd" },
    ],
  },

  labels: {
    label: "Page texts & labels",
    key: "labels",
    fields: [
      { group: "Navigation" },
      { name: "nav.home", label: "Nav · Home", type: "i18n" },
      { name: "nav.programme", label: "Nav · Programme", type: "i18n" },
      { name: "nav.participants", label: "Nav · Participants", type: "i18n" },
      { name: "nav.venue", label: "Nav · Venue", type: "i18n" },
      { group: "Home page" },
      { name: "home.about", label: "About heading", type: "i18n" },
      { name: "home.organizers", label: "Organizers heading", type: "i18n" },
      { name: "home.contact", label: "Contact heading", type: "i18n" },
      { group: "Programme page" },
      { name: "programme.title", label: "Title", type: "i18n" },
      { name: "programme.intro", label: "Intro", type: "i18ntext" },
      { name: "programme.day", label: "“Day” word", type: "i18n" },
      { name: "programme.abstracts", label: "Abstracts heading", type: "i18n" },
      { name: "programme.abstractsPlaceholder", label: "Abstracts placeholder", type: "i18ntext" },
      { name: "programme.tba", label: "“To be announced”", type: "i18n" },
      { group: "Participants page" },
      { name: "participants.title", label: "Title", type: "i18n" },
      { name: "participants.intro", label: "Intro", type: "i18ntext" },
      { name: "participants.empty", label: "Empty message", type: "i18ntext" },
      { name: "participants.roles.speaker", label: "Role · Speaker", type: "i18n" },
      { name: "participants.roles.organizer", label: "Role · Organizer", type: "i18n" },
      { name: "participants.roles.participant", label: "Role · Participant", type: "i18n" },
      { group: "Venue page" },
      { name: "venue.title", label: "Title", type: "i18n" },
      { name: "venue.where", label: "“Where” heading", type: "i18n" },
      { name: "venue.gettingThere", label: "“Getting there” heading", type: "i18n" },
      { name: "venue.practical", label: "“Practical information” heading", type: "i18n" },
      { name: "venue.openMap", label: "“Open in map” link", type: "i18n" },
      { name: "venue.empty", label: "Empty message", type: "i18ntext" },
      { name: "venue.categories.hotel", label: "Category · Accommodation", type: "i18n" },
      { name: "venue.categories.dinner", label: "Category · Dinners & food", type: "i18n" },
      { name: "venue.categories.transport", label: "Category · Transport", type: "i18n" },
      { name: "venue.categories.other", label: "Category · Other", type: "i18n" },
      { group: "Footer" },
      { name: "footer.rights", label: "Footer title", type: "i18n" },
    ],
  },
};

// ---- Repeatable collections ----
const collections = {
  programme: {
    label: "Programme",
    singular: "Session",
    key: "programme",
    summary: (it) => `Day ${it.day} · ${it.start || ""} · ${it.title_en || "(untitled)"}`,
    fields: [
      { name: "day", label: "Day (1–3)", type: "number", min: 1, max: 3, default: 1 },
      { name: "dateLabel", label: "Date label", type: "text", hint: "e.g. 23 September 2026" },
      { name: "start", label: "Start time", type: "text", hint: "e.g. 09:30" },
      { name: "end", label: "End time", type: "text" },
      { name: "type", label: "Type", type: "select", options: TALK_TYPES, default: "talk" },
      { name: "speaker", label: "Speaker", type: "text" },
      { name: "affiliation", label: "Affiliation", type: "text" },
      { name: "title_en", label: "Talk title (English)", type: "text" },
      { name: "title_it", label: "Talk title (Italian)", type: "text" },
    ],
  },

  participants: {
    label: "Participants",
    singular: "Participant",
    key: "participants",
    summary: (it) => `${it.name || "(no name)"}${it.affiliation ? " — " + it.affiliation : ""}`,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "affiliation", label: "Affiliation", type: "text" },
      { name: "role", label: "Role", type: "select", options: ROLES, default: "participant" },
      { name: "url", label: "Homepage (optional)", type: "url" },
    ],
  },

  abstracts: {
    label: "Abstracts",
    singular: "Abstract",
    key: "abstracts",
    summary: (it) => `${it.speaker || "(speaker)"} — ${it.title_en || ""}`,
    fields: [
      { name: "speaker", label: "Speaker", type: "text", required: true },
      { name: "affiliation", label: "Affiliation", type: "text" },
      { name: "title_en", label: "Title (English)", type: "text" },
      { name: "title_it", label: "Title (Italian)", type: "text" },
      { name: "abstract_en", label: "Abstract (English)", type: "markdown" },
      { name: "abstract_it", label: "Abstract (Italian)", type: "markdown" },
    ],
  },

  practical: {
    label: "Practical info",
    singular: "Item",
    key: "practical",
    summary: (it) => `${it.category} · ${it.title || ""}`,
    fields: [
      { name: "category", label: "Category", type: "select", options: CATEGORIES, default: "other" },
      { name: "order", label: "Order", type: "number", default: 1 },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "address", label: "Address (optional)", type: "text" },
      { name: "url", label: "Link (optional)", type: "url" },
      { name: "body_en", label: "Details (English)", type: "markdown" },
      { name: "body_it", label: "Details (Italian)", type: "markdown" },
    ],
  },
};

module.exports = { singletons, collections, TALK_TYPES, ROLES, CATEGORIES };
