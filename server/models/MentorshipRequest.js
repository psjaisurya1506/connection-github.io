const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["student_to_mentor", "mentor_to_mentor"], default: "student_to_mentor", index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () { return this.kind === "student_to_mentor"; }, index: true },
    alumni: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () { return this.kind === "student_to_mentor"; }, index: true },
    mentorRequester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () { return this.kind === "mentor_to_mentor"; }, index: true },
    mentorRecipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: function () { return this.kind === "mentor_to_mentor"; }, index: true },
    topic: { type: String, required: [true, "Topic is required"], trim: true, maxlength: 120 },
    message: { type: String, default: "", trim: true, maxlength: 800 },
    status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled", "completed"], default: "pending" },
    responseNote: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

schema.index({ student: 1, alumni: 1, status: 1 });
schema.index({ alumni: 1, status: 1 });
schema.index({ mentorRequester: 1, mentorRecipient: 1, status: 1 });
schema.index({ mentorRecipient: 1, status: 1 });

module.exports = mongoose.model("MentorshipRequest", schema);
