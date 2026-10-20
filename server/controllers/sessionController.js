const Session = require("../models/Session");
const MentorshipRequest = require("../models/MentorshipRequest");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const notify = require("../utils/notify");
const { str, requireId } = require("../utils/helpers");

const POP = [
  { path: "mentor", select: "name headline company" },
  { path: "student", select: "name department batch" },
  { path: "proposedBy", select: "name" },
];

const isMember = (s, uid) => [s.mentor, s.student].some((id) => String(id?._id || id) === String(uid));

const create = asyncHandler(async (req, res) => {
  const requestId = requireId(req.body.requestId, "request id");
  const r = await MentorshipRequest.findById(requestId);
  if (!r || ![String(r.student), String(r.alumni)].includes(String(req.user._id))) throw new HttpError(404, "Mentorship not found");
  if (r.status !== "accepted") throw new HttpError(400, "Sessions can only be scheduled for accepted mentorships");

  const when = new Date(req.body.scheduledAt);
  if (isNaN(when) || when < new Date()) throw new HttpError(400, "Choose a date and time in the future");
  const link = str(req.body.meetingLink);
  if (link && !/^https?:\/\//i.test(link)) throw new HttpError(400, "Meeting link must start with http(s)://");

  const session = await Session.create({
    mentor: r.alumni,
    student: r.student,
    request: r._id,
    proposedBy: req.user._id,
    title: str(req.body.title),
    scheduledAt: when,
    durationMins: Number(req.body.durationMins) || 30,
    meetingLink: link,
    notes: str(req.body.notes),
  });
  const other = String(r.alumni) === String(req.user._id) ? r.student : r.alumni;
  const otherRole = String(r.alumni) === String(req.user._id) ? "student" : "alumni";
  await notify(req.app, other, { type: "session", text: `${req.user.name} proposed a session: ${session.title}`, link: `/${otherRole}/sessions` });
  res.status(201).json({ message: "Session proposed", session: await session.populate(POP) });
});

const listMine = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ $or: [{ mentor: req.user._id }, { student: req.user._id }] }).populate(POP).sort({ scheduledAt: 1 });
  res.json({ sessions });
});

const setStatus = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const { status } = req.body;
  if (!["confirmed", "cancelled", "completed"].includes(status)) throw new HttpError(400, "Invalid status");
  const s = await Session.findById(req.params.id);
  if (!s || !isMember(s, req.user._id)) throw new HttpError(404, "Session not found");

  if (status === "confirmed") {
    if (s.status !== "pending") throw new HttpError(400, "Only pending sessions can be confirmed");
    if (String(s.proposedBy) === String(req.user._id)) throw new HttpError(400, "The other person needs to confirm your proposal");
  }
  if (status === "completed") {
    if (String(s.mentor) !== String(req.user._id)) throw new HttpError(403, "Only the mentor can mark a session completed");
    if (s.status !== "confirmed") throw new HttpError(400, "Only confirmed sessions can be completed");
  }
  if (status === "cancelled" && ["completed", "cancelled"].includes(s.status)) throw new HttpError(400, `Session is already ${s.status}`);

  s.status = status;
  await s.save();
  const other = String(s.mentor) === String(req.user._id) ? s.student : s.mentor;
  const otherRole = String(s.mentor) === String(req.user._id) ? "student" : "alumni";
  await notify(req.app, other, { type: "session", text: `${req.user.name} ${status} the session "${s.title}"`, link: `/${otherRole}/sessions` });
  res.json({ message: `Session ${status}`, session: await s.populate(POP) });
});

module.exports = { create, listMine, setStatus };
