const MentorshipRequest = require("../models/MentorshipRequest");
const User = require("../models/User");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const notify = require("../utils/notify");
const { str, requireId } = require("../utils/helpers");

const POP = [
  { path: "student", select: "name department batch skills" },
  { path: "alumni", select: "name headline company department" },
  { path: "mentorRequester", select: "name headline company department" },
  { path: "mentorRecipient", select: "name headline company department" },
];

const create = asyncHandler(async (req, res) => {
  const alumniId = requireId(req.body.alumniId, "mentor id");
  const topic = str(req.body.topic);
  if (!topic) throw new HttpError(400, "Please tell the mentor what you want help with");

  const alumni = await User.findOne({ _id: alumniId, role: "alumni", isVerified: true, isActive: { $ne: false } });
  if (!alumni) throw new HttpError(404, "Mentor not found");
  if (alumni.openToMentor === false) throw new HttpError(400, "This mentor is not accepting requests right now");

  const existing = await MentorshipRequest.findOne({ student: req.user._id, alumni: alumniId, status: { $in: ["pending", "accepted"] } });
  if (existing) throw new HttpError(409, existing.status === "pending" ? "You already have a pending request with this mentor" : "You are already connected with this mentor");

  const doc = await MentorshipRequest.create({ student: req.user._id, alumni: alumniId, topic, message: str(req.body.message) });
  await notify(req.app, alumniId, { type: "request", text: `${req.user.name} sent you a mentorship request: ${topic}`, link: "/alumni/requests" });
  res.status(201).json({ message: "Request sent", request: await doc.populate(POP) });
});

const createPeer = asyncHandler(async (req, res) => {
  const mentorId = requireId(req.body.mentorId, "mentor id");
  if (String(mentorId) === String(req.user._id)) throw new HttpError(400, "You cannot request mentorship from yourself");
  const topic = str(req.body.topic);
  if (!topic) throw new HttpError(400, "Please tell the mentor what you want help with");

  const mentor = await User.findOne({ _id: mentorId, role: "alumni", isVerified: true, isActive: { $ne: false } });
  if (!mentor) throw new HttpError(404, "Mentor not found");
  if (mentor.openToMentor === false) throw new HttpError(400, "This mentor is not accepting requests right now");

  const existing = await MentorshipRequest.findOne({
    kind: "mentor_to_mentor",
    mentorRequester: req.user._id,
    mentorRecipient: mentorId,
    status: { $in: ["pending", "accepted"] },
  });
  if (existing) throw new HttpError(409, existing.status === "pending" ? "You already have a pending request with this mentor" : "You are already connected with this mentor");

  const doc = await MentorshipRequest.create({
    kind: "mentor_to_mentor",
    mentorRequester: req.user._id,
    mentorRecipient: mentorId,
    topic,
    message: str(req.body.message),
  });
  await notify(req.app, mentorId, { type: "request", text: `${req.user.name} sent you a mentorship request: ${topic}`, link: "/alumni/requests" });
  res.status(201).json({ message: "Request sent", request: await doc.populate(POP) });
});

const listMine = asyncHandler(async (req, res) => {
  const filter = req.user.role === "student"
    ? { student: req.user._id }
    : { $or: [{ alumni: req.user._id }, { mentorRequester: req.user._id }, { mentorRecipient: req.user._id }] };
  if (req.query.status) filter.status = str(req.query.status);
  const requests = await MentorshipRequest.find(filter).populate(POP).sort({ createdAt: -1 });
  res.json({ requests });
});

const respond = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status)) throw new HttpError(400, "Status must be accepted or rejected");
  const r = await MentorshipRequest.findOne({
    _id: req.params.id,
    $or: [
      { student: { $exists: true }, alumni: req.user._id },
      { kind: "mentor_to_mentor", mentorRecipient: req.user._id },
    ],
  });
  if (!r) throw new HttpError(404, "Request not found");
  if (r.status !== "pending") throw new HttpError(400, `Request is already ${r.status}`);
  r.status = status;
  r.responseNote = str(req.body.note);
  await r.save();
  const requester = r.kind === "mentor_to_mentor" ? r.mentorRequester : r.student;
  const requesterRole = r.kind === "mentor_to_mentor" ? "alumni" : "student";
  await notify(req.app, requester, {
    type: "request",
    text: `${req.user.name} ${status} your mentorship request`,
    link: `/${requesterRole}/requests`,
  });
  res.json({ message: `Request ${status}`, request: await r.populate(POP) });
});

const cancel = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const r = await MentorshipRequest.findOne({
    _id: req.params.id,
    $or: [
      { student: req.user._id, alumni: { $exists: true } },
      { kind: "mentor_to_mentor", mentorRequester: req.user._id },
    ],
  });
  if (!r) throw new HttpError(404, "Request not found");
  if (r.status !== "pending") throw new HttpError(400, "Only pending requests can be cancelled");
  r.status = "cancelled";
  await r.save();
  res.json({ message: "Request cancelled", request: await r.populate(POP) });
});

const complete = asyncHandler(async (req, res) => {
  requireId(req.params.id);
  const r = await MentorshipRequest.findOne({
    _id: req.params.id,
    $or: [
      { alumni: req.user._id, student: { $exists: true } },
      { kind: "mentor_to_mentor", mentorRecipient: req.user._id },
    ],
  });
  if (!r) throw new HttpError(404, "Request not found");
  if (r.status !== "accepted") throw new HttpError(400, "Only accepted mentorships can be completed");
  r.status = "completed";
  await r.save();
  const requester = r.kind === "mentor_to_mentor" ? r.mentorRequester : r.student;
  const requesterRole = r.kind === "mentor_to_mentor" ? "alumni" : "student";
  await notify(req.app, requester, { type: "request", text: `${req.user.name} marked your mentorship as completed`, link: `/${requesterRole}/requests` });
  res.json({ message: "Mentorship completed", request: await r.populate(POP) });
});

module.exports = { create, createPeer, listMine, respond, cancel, complete };
