// End-to-end API test. Needs a running MongoDB: TEST_MONGO_URI (default mongodb://127.0.0.1:27017/alumni_test)
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const connectDB = require("../config/db");
const User = require("../models/User");

const api = request(app);
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const S = {};

before(async () => {
  await connectDB(process.env.TEST_MONGO_URI || "mongodb://127.0.0.1:27017/alumni_test");
  await mongoose.connection.dropDatabase();
  await User.create({ name: "Admin", email: "admin@test.com", password: "secret123", role: "admin", isVerified: true });
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test("registration validation and duplicate protection", async () => {
  assert.equal((await api.post("/api/auth/register").send({ email: "a@b.com" })).status, 400);
  assert.equal((await api.post("/api/auth/register").send({ name: "X", email: "x@b.com", password: "123" })).status, 400);
  assert.equal((await api.post("/api/auth/register").send({ name: "Bad", email: "bad-register@test.com", password: "secret123", registerNumber: "123" })).status, 400);
  const st = await api.post("/api/auth/register").send({ name: "Stu", email: "stu@test.com", password: "secret123", role: "student", registerNumber: "310621234567", department: "CSE" });
  assert.equal(st.status, 201);
  assert.ok(st.body.token);
  assert.equal(st.body.user.password, undefined);
  assert.equal(st.body.user.isVerified, false);
  assert.equal(st.body.user.registerNumber, "310621234567");
  S.student = st.body;
  const al = await api.post("/api/auth/register").send({ name: "Ali", email: "ali@test.com", password: "secret123", role: "alumni", registerNumber: "310629876543" });
  assert.equal(al.body.user.isVerified, false);
  S.alumni = al.body;
  // can't self-register as admin
  const sneaky = await api.post("/api/auth/register").send({ name: "Bad", email: "bad@test.com", password: "secret123", role: "admin", registerNumber: "310620000001" });
  assert.equal(sneaky.body.user.role, "student");
  assert.equal((await api.post("/api/auth/register").send({ name: "Stu", email: "STU@test.com", password: "secret123", registerNumber: "310621234567" })).status, 409);
  assert.equal((await api.post("/api/auth/register").send({ name: "Other", email: "other@test.com", password: "secret123", registerNumber: "310621234567" })).status, 409);
});

test("login, NoSQL-injection resistance, protected routes", async () => {
  assert.equal((await api.post("/api/auth/login").send({ email: "stu@test.com", password: "wrong" })).status, 401);
  assert.equal((await api.post("/api/auth/login").send({ email: { $gt: "" }, password: { $gt: "" } })).status, 400);
  const ok = await api.post("/api/auth/login").send({ email: "stu@test.com", password: "secret123" });
  assert.equal(ok.status, 200);
  assert.equal((await api.get("/api/auth/me")).status, 401);
  assert.equal((await api.get("/api/auth/me").set(auth(ok.body.token))).body.user.email, "stu@test.com");
  const adm = await api.post("/api/auth/login").send({ email: "admin@test.com", password: "secret123" });
  S.admin = adm.body;
});

test("role guards", async () => {
  assert.equal((await api.get("/api/admin/users").set(auth(S.student.token))).status, 403);
  assert.equal((await api.post("/api/jobs").set(auth(S.student.token)).send({ title: "x" })).status, 403);
  assert.equal((await api.get("/api/users/peers").set(auth(S.student.token))).status, 403);
});

test("admins verify student records and change students to alumni", async () => {
  const registration = await api.post("/api/auth/register").send({
    name: "Graduating Student",
    email: "graduating@test.com",
    password: "secret123",
    role: "student",
    registerNumber: "310620000002",
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.isVerified, false);
  const queued = await api.get("/api/admin/users?verified=false&search=310620000002").set(auth(S.admin.token));
  assert.equal(queued.body.total, 1);
  assert.equal(queued.body.users[0].registerNumber, "310620000002");
  const approved = await api.patch(`/api/admin/users/${registration.body.user.id}/verify`).set(auth(S.admin.token)).send({ verified: true });
  assert.equal(approved.body.user.isVerified, true);
  const promoted = await api.patch(`/api/admin/users/${registration.body.user.id}/role`).set(auth(S.admin.token)).send({ role: "alumni" });
  assert.equal(promoted.body.user.role, "alumni");
  assert.equal(promoted.body.user.openToMentor, true);
  assert.equal((await api.patch(`/api/admin/users/${registration.body.user.id}/role`).set(auth(S.admin.token)).send({ role: "admin" })).status, 400);
  // This account only exists to exercise verify/promote. Remove it so later tests that count
  // verified alumni (stats, peer directory) see only the accounts they create themselves.
  await User.deleteOne({ _id: registration.body.user.id });
});

test("unverified alumni are hidden and restricted; admin verifies", async () => {
  let m = await api.get("/api/users/mentors").set(auth(S.student.token));
  // Earlier tests promote and verify another account as an alumni mentor.
  // Assert that this specific unverified alumni is hidden, rather than assuming
  // the entire directory is empty after earlier tests have created a verified mentor.
  assert.equal(m.body.mentors.some((mentor) => String(mentor.id) === String(S.alumni.user.id)), false);
  const job = await api.post("/api/jobs").set(auth(S.alumni.token)).send({ title: "Dev", company: "Zoho", description: "d" });
  assert.equal(job.status, 403);

  const q = await api.get("/api/admin/users?role=alumni&verified=false").set(auth(S.admin.token));
  assert.equal(q.body.total, 1);
  const v = await api.patch(`/api/admin/users/${S.alumni.user.id}/verify`).set(auth(S.admin.token)).send({ verified: true });
  assert.equal(v.body.user.isVerified, true);

  await api.put("/api/users/me").set(auth(S.alumni.token)).send({ headline: "Engineer", company: "Zoho", skills: "React, Node", experience: 4 });
  m = await api.get("/api/users/mentors?search=react").set(auth(S.student.token));
  assert.equal(m.body.total, 1);
  assert.equal(m.body.mentors[0].password, undefined);
  assert.equal(m.body.mentors[0].email, undefined);
  // regex characters are escaped, not executed
  assert.equal((await api.get("/api/users/mentors?search=.*(").set(auth(S.student.token))).status, 200);
});

test("mentorship request lifecycle", async () => {
  const send = await api.post("/api/requests").set(auth(S.student.token)).send({ alumniId: S.alumni.user.id, topic: "Career", message: "help" });
  assert.equal(send.status, 201);
  assert.equal((await api.post("/api/requests").set(auth(S.student.token)).send({ alumniId: S.alumni.user.id, topic: "Again" })).status, 409);
  S.reqId = send.body.request._id;

  // chat is blocked before acceptance
  assert.equal((await api.post(`/api/messages/${S.alumni.user.id}`).set(auth(S.student.token)).send({ text: "hi" })).status, 403);
  // only the addressed alumni can respond; students cannot
  assert.equal((await api.patch(`/api/requests/${S.reqId}/respond`).set(auth(S.student.token)).send({ status: "accepted" })).status, 403);
  const acc = await api.patch(`/api/requests/${S.reqId}/respond`).set(auth(S.alumni.token)).send({ status: "accepted" });
  assert.equal(acc.body.request.status, "accepted");
  assert.equal((await api.patch(`/api/requests/${S.reqId}/respond`).set(auth(S.alumni.token)).send({ status: "rejected" })).status, 400);

  const n = await api.get("/api/notifications").set(auth(S.student.token));
  assert.ok(n.body.unread >= 1);
  const list = await api.get("/api/requests").set(auth(S.alumni.token));
  assert.equal(list.body.requests.length, 1);
});

test("messaging after acceptance", async () => {
  const s = await api.post(`/api/messages/${S.alumni.user.id}`).set(auth(S.student.token)).send({ text: "Hello mentor" });
  assert.equal(s.status, 201);
  const convos = await api.get("/api/messages/conversations").set(auth(S.alumni.token));
  assert.equal(convos.body.unreadTotal, 1);
  const thread = await api.get(`/api/messages/${S.student.user.id}`).set(auth(S.alumni.token));
  assert.equal(thread.body.messages.length, 1);
  const after = await api.get("/api/messages/conversations").set(auth(S.alumni.token));
  assert.equal(after.body.unreadTotal, 0);
  const c = await api.get("/api/messages/contacts").set(auth(S.student.token));
  assert.equal(c.body.contacts.length, 1);
});

test("sessions: propose, confirm by other party, complete by mentor", async () => {
  const when = new Date(Date.now() + 864e5).toISOString();
  assert.equal((await api.post("/api/sessions").set(auth(S.student.token)).send({ requestId: S.reqId, title: "Past", scheduledAt: "2000-01-01" })).status, 400);
  const p = await api.post("/api/sessions").set(auth(S.student.token)).send({ requestId: S.reqId, title: "Kickoff", scheduledAt: when });
  assert.equal(p.status, 201);
  const id = p.body.session._id;
  assert.equal((await api.patch(`/api/sessions/${id}/status`).set(auth(S.student.token)).send({ status: "confirmed" })).status, 400);
  assert.equal((await api.patch(`/api/sessions/${id}/status`).set(auth(S.alumni.token)).send({ status: "confirmed" })).body.session.status, "confirmed");
  assert.equal((await api.patch(`/api/sessions/${id}/status`).set(auth(S.student.token)).send({ status: "completed" })).status, 403);
  assert.equal((await api.patch(`/api/sessions/${id}/status`).set(auth(S.alumni.token)).send({ status: "completed" })).body.session.status, "completed");
});

test("jobs: post, search, save, ownership", async () => {
  const j = await api.post("/api/jobs").set(auth(S.alumni.token)).send({ title: "React Intern", company: "Zoho", description: "Build UIs", type: "internship", skills: "React, CSS", applyLink: "https://x.com" });
  assert.equal(j.status, 201);
  const id = j.body.job._id;
  assert.equal((await api.post("/api/jobs").set(auth(S.alumni.token)).send({ title: "T", company: "C", description: "d", applyLink: "javascript:alert(1)" })).status, 400);
  const l = await api.get("/api/jobs?type=internship&search=react").set(auth(S.student.token));
  assert.equal(l.body.total, 1);
  assert.equal((await api.post(`/api/jobs/${id}/save`).set(auth(S.student.token))).body.saved, true);
  assert.equal((await api.get("/api/jobs?saved=true").set(auth(S.student.token))).body.total, 1);
  assert.equal((await api.put(`/api/jobs/${id}`).set(auth(S.admin.token)).send({ title: "Edited" })).body.job.title, "Edited");
  const stats = await api.get("/api/dashboard/stats").set(auth(S.student.token));
  assert.equal(stats.body.stats.saved, 1);
  assert.equal((await api.delete(`/api/jobs/${id}`).set(auth(S.alumni.token))).status, 200);
});

test("admin overview, deactivate blocks login", async () => {
  const st = await api.get("/api/dashboard/stats").set(auth(S.admin.token));
  assert.equal(st.body.stats.alumni, 1);
  await api.patch(`/api/admin/users/${S.student.user.id}/active`).set(auth(S.admin.token)).send({ active: false });
  assert.equal((await api.post("/api/auth/login").send({ email: "stu@test.com", password: "secret123" })).status, 403);
  assert.equal((await api.get("/api/auth/me").set(auth(S.student.token))).status, 401);
});

test("verified alumni can request peer mentorship and message after acceptance", async () => {
  const registration = await api.post("/api/auth/register").send({
    name: "Peer Mentor",
    email: "peer@test.com",
    password: "secret123",
    role: "alumni",
    registerNumber: "310620000003",
  });
  assert.equal(registration.status, 201);
  S.peer = registration.body;
  const unverifiedPeers = await api.get("/api/users/peers").set(auth(S.alumni.token));
  assert.equal(unverifiedPeers.body.total, 0);
  const verified = await api.patch(`/api/admin/users/${S.peer.user.id}/verify`).set(auth(S.admin.token)).send({ verified: true });
  assert.equal(verified.body.user.isVerified, true);

  const peers = await api.get("/api/users/peers").set(auth(S.alumni.token));
  assert.equal(peers.body.total, 1);
  assert.equal(peers.body.mentors[0].id, S.peer.user.id);

  assert.equal((await api.post("/api/requests/peer").set(auth(S.alumni.token)).send({ mentorId: S.alumni.user.id, topic: "Peer advice" })).status, 400);
  const sent = await api.post("/api/requests/peer").set(auth(S.alumni.token)).send({
    mentorId: S.peer.user.id,
    topic: "Leadership",
    message: "I'd appreciate your perspective.",
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.request.kind, "mentor_to_mentor");
  S.peerRequestId = sent.body.request._id;
  assert.equal((await api.patch(`/api/requests/${S.peerRequestId}/cancel`).set(auth(S.peer.token)).send({})).status, 404);
  assert.equal((await api.patch(`/api/requests/${S.peerRequestId}/cancel`).set(auth(S.alumni.token)).send({})).status, 200);
  const resent = await api.post("/api/requests/peer").set(auth(S.alumni.token)).send({ mentorId: S.peer.user.id, topic: "Leadership" });
  assert.equal(resent.status, 201);
  S.peerRequestId = resent.body.request._id;
  assert.equal((await api.post("/api/requests/peer").set(auth(S.alumni.token)).send({ mentorId: S.peer.user.id, topic: "Again" })).status, 409);
  assert.equal((await api.get("/api/users/peers").set(auth(S.alumni.token))).body.mentors[0].requestStatus, "pending");
  assert.equal((await api.get(`/api/messages/${S.peer.user.id}`).set(auth(S.alumni.token))).status, 403);
  assert.equal((await api.patch(`/api/requests/${S.peerRequestId}/respond`).set(auth(S.alumni.token)).send({ status: "accepted" })).status, 404);

  const incoming = await api.get("/api/requests").set(auth(S.peer.token));
  assert.equal(incoming.body.requests.length, 2);
  assert.ok(incoming.body.requests.every((r) => r.mentorRequester._id === S.alumni.user.id));
  const outgoing = await api.get("/api/requests").set(auth(S.alumni.token));
  assert.ok(outgoing.body.requests.some((r) => r._id === S.peerRequestId));

  const accepted = await api.patch(`/api/requests/${S.peerRequestId}/respond`).set(auth(S.peer.token)).send({ status: "accepted" });
  assert.equal(accepted.body.request.status, "accepted");
  const message = await api.post(`/api/messages/${S.peer.user.id}`).set(auth(S.alumni.token)).send({ text: "Hello, fellow mentor" });
  assert.equal(message.status, 201);
  const thread = await api.get(`/api/messages/${S.alumni.user.id}`).set(auth(S.peer.token));
  assert.equal(thread.body.messages.length, 1);

  const senderContacts = await api.get("/api/messages/contacts").set(auth(S.alumni.token));
  assert.ok(senderContacts.body.contacts.some((contact) => String(contact._id) === S.peer.user.id));
  const recipientContacts = await api.get("/api/messages/contacts").set(auth(S.peer.token));
  assert.equal(recipientContacts.body.contacts.length, 1);

  const completed = await api.patch(`/api/requests/${S.peerRequestId}/complete`).set(auth(S.peer.token)).send({});
  assert.equal(completed.body.request.status, "completed");
});

test("regressions: no password hash in any user payload, empty bodies, unknown recipients", async () => {
  const adm = await api.post("/api/auth/login").send({ email: "admin@test.com", password: "secret123" });
  const stu = S.student;
  await api.patch(`/api/admin/users/${stu.user.id}/active`).set(auth(adm.body.token)).send({ active: true }); // earlier test deactivated them
  // profile lookup must never expose the hash
  const prof = await api.get(`/api/users/${adm.body.user.id}`).set(auth(stu.token));
  assert.equal(prof.status, 200);
  assert.equal(prof.body.user.password, undefined);
  assert.equal(JSON.stringify((await api.get("/api/users/mentors").set(auth(stu.token))).body).includes("$2"), false);
  assert.equal(JSON.stringify((await api.get("/api/admin/users").set(auth(adm.body.token))).body).includes("$2"), false);
  // POST with no body is a 400, not a 500
  assert.equal((await api.post("/api/auth/register")).status, 400);
  assert.equal((await api.post("/api/auth/login")).status, 400);
  // invalid email format
  assert.equal((await api.post("/api/auth/register").send({ name: "N", email: "not-an-email", password: "secret123" })).status, 400);
  // admin messaging a user id that does not exist is a 404, not a 500
  const ghost = new mongoose.Types.ObjectId().toString();
  assert.equal((await api.post(`/api/messages/${ghost}`).set(auth(adm.body.token)).send({ text: "hi" })).status, 404);
  // string "false" must not be treated as true
  const off = await api.patch(`/api/admin/users/${stu.user.id}/active`).set(auth(adm.body.token)).send({ active: "false" });
  assert.equal(off.body.user.isActive, false);
  await api.patch(`/api/admin/users/${stu.user.id}/active`).set(auth(adm.body.token)).send({ active: true });
});
