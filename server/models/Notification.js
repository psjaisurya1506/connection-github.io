const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, default: "info" },
    text: { type: String, required: true },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", schema);
