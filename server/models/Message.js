const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    conversationId: { type: String, required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ conversationId: 1, createdAt: 1 });
schema.index({ sender: 1, createdAt: -1 });
schema.index({ receiver: 1, readAt: 1 });

schema.statics.convoId = (a, b) => [String(a), String(b)].sort().join("_");

module.exports = mongoose.model("Message", schema);
