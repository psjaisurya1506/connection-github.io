const Job = require("../models/Job");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const { toBool, str, parseList, escapeRegex, pageParams, requireId } = require("../utils/helpers");

const POP = { path: "postedBy", select: "name headline company" };

const shape = (job, userId) => {
  const o = job.toObject ? job.toObject() : job;
  const saved = (o.savedBy || []).some((id) => String(id) === String(userId));
  delete o.savedBy;
  return { ...o, id: o._id, saved, savedCount: (job.savedBy || []).length };
};

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {};
  if (req.query.mine === "true") filter.postedBy = req.user._id;
  else if (req.user.role !== "admin") filter.isActive = { $ne: false };
  if (req.query.saved === "true") filter.savedBy = req.user._id;
  if (["job", "internship"].includes(req.query.type)) filter.type = req.query.type;
  if (["onsite", "remote", "hybrid"].includes(req.query.mode)) filter.mode = req.query.mode;
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ title: rx }, { company: rx }, { location: rx }, { skills: rx }];
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter).populate(POP).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Job.countDocuments(filter),
  ]);
  res.json({ jobs: jobs.map((j) => shape(j, req.user._id)), total, page, pages: Math.ceil(total / limit) });
});

const fields = (b) => {
  const out = {};
  for (const k of ["title", "company", "location", "description", "salary", "applyLink"]) if (b[k] !== undefined) out[k] = str(b[k]);
  if (["job", "internship"].includes(b.type)) out.type = b.type;
  if (["onsite", "remote", "hybrid"].includes(b.mode)) out.mode = b.mode;
  if (b.skills !== undefined) out.skills = parseList(b.skills);
  if (b.deadline !== undefined) out.deadline = b.deadline ? new Date(b.deadline) : undefined;
  if (b.isActive !== undefined) out.isActive = toBool(b.isActive);
  if (out.applyLink && !/^https?:\/\//i.test(out.applyLink) && !/^\S+@\S+\.\S+$/.test(out.applyLink))
    throw new HttpError(400, "Apply link must be a URL starting with http(s):// or an email address");
  return out;
};

const create = asyncHandler(async (req, res) => {
  const job = await Job.create({ ...fields(req.body), postedBy: req.user._id });
  res.status(201).json({ message: "Opportunity posted", job: shape(await job.populate(POP), req.user._id) });
});

const loadOwned = async (req) => {
  requireId(req.params.id);
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, "Opportunity not found");
  if (req.user.role !== "admin" && String(job.postedBy) !== String(req.user._id)) throw new HttpError(403, "You can only change your own posts");
  return job;
};

const update = asyncHandler(async (req, res) => {
  const job = await loadOwned(req);
  Object.assign(job, fields(req.body));
  await job.save();
  res.json({ message: "Opportunity updated", job: shape(await job.populate(POP), req.user._id) });
});

const remove = asyncHandler(async (req, res) => {
  const job = await loadOwned(req);
  await job.deleteOne();
  res.json({ message: "Opportunity deleted" });
});

const toggleSave = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const job = await Job.findById(req.params.id);
  if (!job) throw new HttpError(404, "Opportunity not found");
  const i = job.savedBy.findIndex((id) => String(id) === String(req.user._id));
  if (i >= 0) job.savedBy.splice(i, 1);
  else job.savedBy.push(req.user._id);
  await job.save();
  res.json({ saved: i < 0 });
});

module.exports = { list, create, update, remove, toggleSave };
