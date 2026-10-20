const User = require("../models/User");
const Job = require("../models/Job");
const Message = require("../models/Message");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const MentorshipRequest = require("../models/MentorshipRequest");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const notify = require("../utils/notify");
const { toBool, str, escapeRegex, pageParams, requireId } = require("../utils/helpers");

// ---------- Dashboard stats (role aware) ----------
const stats = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const now = new Date();
  const upcoming = (f) => Session.countDocuments({ ...f, status: { $in: ["pending", "confirmed"] }, scheduledAt: { $gte: now } });
  const unread = await Message.countDocuments({ receiver: me, readAt: null });

  if (req.user.role === "student") {
    const [mentors, sent, accepted, sessions, saved] = await Promise.all([
      User.countDocuments({ role: "alumni", isVerified: true, isActive: { $ne: false } }),
      MentorshipRequest.countDocuments({ student: me }),
      MentorshipRequest.countDocuments({ student: me, status: "accepted" }),
      upcoming({ student: me }),
      Job.countDocuments({ savedBy: me, isActive: { $ne: false } }),
    ]);
    return res.json({ stats: { mentors, sent, accepted, sessions, saved, unread } });
  }
  if (req.user.role === "alumni") {
    const [pending, mentees, posts, sessions] = await Promise.all([
      MentorshipRequest.countDocuments({ alumni: me, status: "pending" }),
      MentorshipRequest.countDocuments({ alumni: me, status: "accepted" }),
      Job.countDocuments({ postedBy: me, isActive: { $ne: false } }),
      upcoming({ mentor: me }),
    ]);
    return res.json({ stats: { pending, mentees, posts, sessions, unread } });
  }
  const monthAgo = new Date(Date.now() - 30 * 864e5);
  const [students, alumni, pendingVerification, jobs, requestsMonth, sessionsDone] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "alumni", isVerified: true }),
    User.countDocuments({ role: { $in: ["student", "alumni"] }, isVerified: false, isActive: { $ne: false } }),
    Job.countDocuments({ isActive: { $ne: false } }),
    MentorshipRequest.countDocuments({ createdAt: { $gte: monthAgo } }),
    Session.countDocuments({ status: "completed" }),
  ]);
  res.json({ stats: { students, alumni, pendingVerification, jobs, requestsMonth, sessionsDone, unread } });
});

// ---------- Notifications ----------
const notifications = asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.json({ notifications: items, unread });
});

const readAll = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: "All notifications marked as read" });
});

// ---------- Admin ----------
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams({ ...req.query, limit: req.query.limit || 20 });
  const filter = {};
  if (["student", "alumni", "admin"].includes(req.query.role)) filter.role = req.query.role;
  if (req.query.verified === "false") {
    filter.isVerified = false;
    if (!filter.role) filter.role = { $in: ["student", "alumni"] };
    else if (filter.role === "admin") filter.role = { $in: [] };
  }
  if (req.query.verified === "true") filter.isVerified = true;
  if (req.query.active === "false") filter.isActive = false;
  const search = str(req.query.search);
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { department: rx }, { registerNumber: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ users, total, page, pages: Math.ceil(total / limit) });
});

const verifyUser = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  if (!["student", "alumni"].includes(user.role)) throw new HttpError(400, "Only student and alumni accounts can be verified");
  user.isVerified = req.body.verified === undefined ? true : toBool(req.body.verified);
  await user.save();
  await notify(req.app, user._id, {
    type: "verification",
    text: user.isVerified ? "Your account has been verified by an admin." : "Your account verification was revoked by an admin.",
    link: `/${user.role}/dashboard`,
  });
  res.json({ message: user.isVerified ? "User verified" : "Verification revoked", user: user.toSafe() });
});

const setUserRole = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const role = req.body?.role;
  if (!["student", "alumni"].includes(role)) throw new HttpError(400, "Role must be student or alumni");
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, "You cannot change your own role");
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  if (!["student", "alumni"].includes(user.role)) throw new HttpError(400, "Only student and alumni roles can be changed");
  if (user.role === role) return res.json({ message: "User role is unchanged", user: user.toSafe() });
  user.role = role;
  user.openToMentor = role === "alumni";
  await user.save();
  await notify(req.app, user._id, {
    type: "role",
    text: `An admin changed your account type to ${role}.`,
    link: `/${user.role}/dashboard`,
  });
  res.json({ message: `User role changed to ${role}`, user: user.toSafe() });
});

const setActive = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  if (String(req.params.id) === String(req.user._id)) throw new HttpError(400, "You cannot deactivate your own account");
  const user = await User.findById(req.params.id);
  if (!user) throw new HttpError(404, "User not found");
  user.isActive = toBool(req.body.active);
  await user.save();
  res.json({ message: user.isActive ? "User reactivated" : "User deactivated", user: user.toSafe() });
});

module.exports = { stats, notifications, readAll, listUsers, verifyUser, setUserRole, setActive };
