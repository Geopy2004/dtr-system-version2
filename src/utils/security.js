const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const BIDI_CONTROL_CHARS = /[\u202A-\u202E\u2066-\u2069]/g;
const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DB_IDENTIFIER_RE = /^[a-z_][a-z0-9_]*$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const sanitizeText = (
  value,
  { maxLength = 500, allowNewlines = true, fallback = "" } = {}
) => {
  if (value == null) return fallback;

  const normalized = String(value)
    .replace(CONTROL_CHARS, "")
    .replace(BIDI_CONTROL_CHARS, "");
  const compacted = allowNewlines
    ? normalized.replace(/\r\n?/g, "\n")
    : normalized.replace(/\s+/g, " ");

  return compacted.trim().slice(0, maxLength);
};

export const sanitizeEmail = (value) =>
  sanitizeText(value, { maxLength: 254, allowNewlines: false }).toLowerCase();

export const sanitizeCsvValue = (value) => {
  const text = String(value ?? "");
  return CSV_FORMULA_PREFIX.test(text) ? `'${text}` : text;
};

export const isSafeDbIdentifier = (value) =>
  typeof value === "string" && DB_IDENTIFIER_RE.test(value);

export const assertUuid = (value, fieldName = "ID") => {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
};

export const isUuid = (value) => typeof value === "string" && UUID_RE.test(value);

export const assertIsoDate = (value, fieldName = "date") => {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
};

export const assertOptionalIsoDate = (value, fieldName = "date") =>
  value ? assertIsoDate(value, fieldName) : null;

export const assertTime = (value, fieldName = "time") => {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
};

export const assertEnum = (value, allowedValues, fieldName = "value") => {
  if (!allowedValues.includes(value)) {
    throw new Error(`Invalid ${fieldName}.`);
  }

  return value;
};

export const normalizeLimit = (value, fallback = 100, max = 250) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

export const normalizeNonNegativeInt = (value, fallback = 0, max = 1440) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
};

export const normalizePositiveNumber = (value, fallback = 1, max = 365) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
};

export const sanitizeFilename = (value) => {
  const safe = sanitizeText(value, { maxLength: 120, allowNewlines: false })
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "");

  return safe || "upload";
};

export const assertAllowedFile = (
  file,
  { allowedTypes, maxBytes, fieldName = "file" }
) => {
  if (!file) throw new Error(`Missing ${fieldName}.`);
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Unsupported ${fieldName} type.`);
  }
  if (file.size > maxBytes) {
    throw new Error(`${fieldName} is too large.`);
  }

  return file;
};
