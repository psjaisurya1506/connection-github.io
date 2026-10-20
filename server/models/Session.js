const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "MentorshipRequest" },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 120 },
    scheduledAt: { type: Date, required: [true, "Date and time are required"] },
    durationMins: { type: Number, default: 30, min: 10, max: 240 },
    meetingLink: { type: String, default: "" },
    notes: { type: String, default: "", maxlength: 600 },
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Session", schema);
