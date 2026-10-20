const Message = require("../models/Message");
const MentorshipRequest = require("../models/MentorshipRequest");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const notify = require("../utils/notify");
const { str, requireId } = require("../utils/helpers");

const CONTACT_FIELDS = "name role headline company department";

// Two people may chat once a mentorship request between them has been accepted (admins can message anyone).
async function canChat(me, other) {
  if (!other || other.isActive === false) return false;
  if (me.role === "admin" || other.role === "admin") return true;
  if (me.role === "alumni" && other.role === "alumni") {
    return !!(await MentorshipRequest.exists({
      kind: "mentor_to_mentor",
      status: { $in: ["accepted", "completed"] },
      $or: [
        { mentorRequester: me._id, mentorRecipient: other._id },
        { mentorRequester: other._id, mentorRecipient: me._id },
      ],
    }));
  }
  const otherId = other._id;
  const filter = me.role === "student" ? { student: me._id, alumni: otherId } : { alumni: me._id, student: otherId };
  return !!(await MentorshipRequest.exists({ ...filter, status: { $in: ["accepted", "completed"] } }));
}

const contacts = asyncHandler(async (req, res) => {
  let ids = [];
  if (req.user.role === "admin") {
    const users = await User.find({ _id: { $ne: req.user._id }, isActive: { $ne: false } }).select(CONTACT_FIELDS).limit(200);
    return res.json({ contacts: users });
  }
  const mine = req.user.role === "student"
    ? { student: req.user._id }
    : { $or: [{ alumni: req.user._id }, { mentorRequester: req.user._id }, { mentorRecipient: req.user._id }] };
  const reqs = await MentorshipRequest.find({ ...mine, status: { $in: ["accepted", "completed"] } })
    .select("student alumni kind mentorRequester mentorRecipient");
  ids = [...new Set(reqs.map((r) => {
    if (r.kind === "mentor_to_mentor") {
      return String(r.mentorRequester) === String(req.user._id) ? String(r.mentorRecipient) : String(r.mentorRequester);
    }
    return String(req.user.role === "student" ? r.alumni : r.student);
  }))];
  const users = await User.find({ _id: { $in: ids }, isActive: { $ne: false } }).select(CONTACT_FIELDS);
  res.json({ contacts: users });
});

const conversations = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const [recent, unreadRows] = await Promise.all([
    // Newest messages first; the first one seen per person is the conversation preview.
    Message.find({ $or: [{ sender: me }, { receiver: me }] }).sort({ createdAt: -1 }).limit(1000).lean(),
    // Exact unread counts straight from the database (not limited to the recent window above).
    Message.aggregate([{ $match: { receiver: me, readAt: null } }, { $group: { _id: "$sender", n: { $sum: 1 } } }]),
  ]);
  const unreadBy = Object.fromEntries(unreadRows.map((r) => [String(r._id), r.n]));
  const seen = new Map();
  for (const m of recent) {
    const other = String(m.sender) === String(me) ? String(m.receiver) : String(m.sender);
    if (!seen.has(other)) seen.set(other, { _id: other, lastMessage: m, unread: unreadBy[other] || 0 });
  }
  const groups = [...seen.values()];
  const users = await User.find({ _id: { $in: groups.map((g) => g._id) } }).select(CONTACT_FIELDS).lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  const list = groups
    .filter((g) => byId[String(g._id)])
    .map((g) => ({ userId: String(g._id), lastMessage: g.lastMessage, unread: g.unread, user: { ...byId[String(g._id)], id: byId[String(g._id)]._id } }));
  res.json({ conversations: list, unreadTotal: list.reduce((n, c) => n + c.unread, 0) });
});

const thread = asyncHandler(async (req, res) => {
  requireId(req.params.userId, "user id");
  const other = await User.findById(req.params.userId).select("role isActive");
  if (!other || other.isActive === false) throw new HttpError(404, "User not found");
  if (!(await canChat(req.user, other))) throw new HttpError(403, "You can chat once a mentorship request has been accepted");
  const convoId = Message.convoId(req.user._id, req.params.userId);
  const messages = await Message.find({ conversationId: convoId }).sort({ createdAt: 1 }).limit(500);
  await Message.updateMany({ conversationId: convoId, receiver: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ messages });
});

const send = asyncHandler(async (req, res) => {
  requireId(req.params.userId, "user id");
  const text = str(req.body.text);
  if (!text) throw new HttpError(400, "Message cannot be empty");
  if (String(req.params.userId) === String(req.user._id)) throw new HttpError(400, "You cannot message yourself");
  const other = await User.findById(req.params.userId).select("role isActive");
  if (!other || other.isActive === false) throw new HttpError(404, "User not found");
  if (!(await canChat(req.user, other)))
    throw new HttpError(403, "You can chat once a mentorship request has been accepted");

  const message = await Message.create({
    conversationId: Message.convoId(req.user._id, req.params.userId),
    sender: req.user._id,
    receiver: req.params.userId,
    text,
  });
  const io = req.app.get("io");
  if (io) io.to(`user:${req.params.userId}`).emit("message", message);
  await notify(req.app, req.params.userId, { type: "message", text: `New message from ${req.user.name}`, link: `/${other.role}/messages?with=${req.user._id}` });
  res.status(201).json({ message });
});

module.exports = { contacts, conversations, thread, send, canChat };
