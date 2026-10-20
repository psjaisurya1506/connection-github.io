const Notification = require("../models/Notification");

// Persist a notification and push it to the user's live socket room (if connected).
module.exports = async function notify(app, userId, { type = "info", text, link = "" }) {
  const n = await Notification.create({ user: userId, type, text, link });
  const io = app.get("io");
  if (io) io.to(`user:${userId}`).emit("notification", n);
  return n;
};
