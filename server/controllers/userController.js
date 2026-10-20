const User = require("../models/User");
const MentorshipRequest = require("../models/MentorshipRequest");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const { toBool, str, parseList, escapeRegex, pageParams, requireId } = require("../utils/helpers");

const PUBLIC_FIELDS = "name role department batch skills bio experience headline company linkedin openToMentor isVerified profileImage";

// GET /api/users/mentors — verified alumni directory with filters
const listMentors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = { role: "alumni", isVerified: true, isActive: { $ne: false }, openToMentor: { $ne: false } };

  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { headline: rx }, { company: rx }, { skills: rx }, { bio: rx }];
  }
  if (str(req.query.department)) filter.department = new RegExp(`^${escapeRegex(str(req.query.department))}$`, "i");
  if (str(req.query.batch)) filter.batch = str(req.query.batch);
  if (str(req.query.skill)) filter.skills = new RegExp(`^${escapeRegex(str(req.query.skill))}$`, "i");

  const [mentors, total] = await Promise.all([
    User.find(filter).select(PUBLIC_FIELDS).sort({ experience: -1, name: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  // Attach the current student's request status per mentor so the UI can show "Requested"/"Connected".
  let statusByMentor = {};
  if (req.user.role === "student" && mentors.length) {
    const reqs = await MentorshipRequest.find({
      student: req.user._id,
      alumni: { $in: mentors.map((m) => m._id) },
      status: { $in: ["pending", "accepted", "completed"] },
    }).select("alumni status");
    statusByMentor = Object.fromEntries(reqs.map((r) => [String(r.alumni), r.status]));
  }
  const data = mentors.map((m) => ({ ...m, id: m._id, requestStatus: statusByMentor[String(m._id)] || null }));

  res.json({ mentors: data, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/users/peers — alumni directory for verified alumni looking for peer mentorship.
const listPeers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req.query);
  const filter = {
    _id: { $ne: req.user._id },
    role: "alumni",
    isVerified: true,
    isActive: { $ne: false },
    openToMentor: { $ne: false },
  };
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { headline: rx }, { company: rx }, { skills: rx }, { bio: rx }];
  }

  const [peers, total] = await Promise.all([
    User.find(filter).select(PUBLIC_FIELDS).sort({ experience: -1, name: 1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const requests = peers.length
    ? await MentorshipRequest.find({
      kind: "mentor_to_mentor",
      mentorRequester: req.user._id,
      mentorRecipient: { $in: peers.map((peer) => peer._id) },
      status: { $in: ["pending", "accepted"] },
    }).select("mentorRecipient status")
    : [];
  const statusByPeer = Object.fromEntries(requests.map((r) => [String(r.mentorRecipient), r.status]));
  const data = peers.map((peer) => ({ ...peer, id: peer._id, requestStatus: statusByPeer[String(peer._id)] || null }));

  res.json({ mentors: data, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/users/filters — distinct values for filter dropdowns
const mentorFilters = asyncHandler(async (req, res) => {
  const base = { role: "alumni", isVerified: true, isActive: { $ne: false } };
  const [departments, batches, skills] = await Promise.all([
    User.distinct("department", base),
    User.distinct("batch", base),
    User.distinct("skills", base),
  ]);
  const clean = (a) => a.filter(Boolean).sort();
  res.json({ departments: clean(departments), batches: clean(batches), skills: clean(skills) });
});

const getProfile = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const user = await User.findOne({ _id: req.params.id, isActive: { $ne: false } }).select(PUBLIC_FIELDS);
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user: { ...user.toObject(), id: user._id } });
});

const updateMe = asyncHandler(async (req, res) => {
  const b = req.body;
  const u = req.user;
  if (b.name !== undefined) {
    if (!str(b.name)) throw new HttpError(400, "Name cannot be empty");
    u.name = str(b.name);
  }
  for (const k of ["department", "batch", "bio", "headline", "company", "linkedin", "profileImage"]) {
    if (b[k] !== undefined) u[k] = str(b[k]);
  }
  if (b.skills !== undefined) u.skills = parseList(b.skills);
  if (b.experience !== undefined) u.experience = Math.max(0, Number(b.experience) || 0);
  if (b.openToMentor !== undefined && u.role === "alumni") u.openToMentor = toBool(b.openToMentor);
  await u.save();
  res.json({ message: "Profile updated", user: u.toSafe() });
});

module.exports = { listMentors, listPeers, mentorFilters, getProfile, updateMe };
