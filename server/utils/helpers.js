const mongoose = require("mongoose");
const HttpError = require("./httpError");

// Escape user input before using it inside a RegExp (prevents ReDoS / regex injection).
const escapeRegex = (s = "") => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isId = (id) => mongoose.Types.ObjectId.isValid(id);

const requireId = (id, label = "id") => {
  if (!isId(id)) throw new HttpError(400, `Invalid ${label}`);
  return id;
};

// Only allow plain strings from the request body (blocks NoSQL operator injection like {"$gt": ""}).
const str = (v) => (typeof v === "string" ? v.trim() : "");

const parseList = (v) => {
  if (Array.isArray(v)) return v.map(str).filter(Boolean).slice(0, 30);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30);
  return [];
};

const pageParams = (q) => {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};

const pick = (obj, keys) => keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

// Accepts true/false as real booleans or the strings "true"/"false" (Boolean("false") would wrongly be true).
const toBool = (v) => v === true || v === "true" || v === 1 || v === "1";

module.exports = { toBool, escapeRegex, isId, requireId, str, parseList, pageParams, pick };
