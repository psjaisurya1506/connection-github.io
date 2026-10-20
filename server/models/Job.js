const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: 120 },
    company: { type: String, required: [true, "Company is required"], trim: true, maxlength: 80 },
    location: { type: String, default: "", trim: true },
    type: { type: String, enum: ["job", "internship"], default: "job" },
    mode: { type: String, enum: ["onsite", "remote", "hybrid"], default: "onsite" },
    description: { type: String, required: [true, "Description is required"], trim: true, maxlength: 3000 },
    skills: { type: [String], default: [] },
    salary: { type: String, default: "" },
    applyLink: { type: String, default: "" },
    deadline: { type: Date },
    isActive: { type: Boolean, default: true },
    savedBy: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] },
  },
  { timestamps: true }
);

schema.index({ createdAt: -1 });

module.exports = mongoose.model("Job", schema);
