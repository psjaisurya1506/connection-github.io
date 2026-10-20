const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    registerNumber: { type: String, trim: true, match: /^31062\d{7}$/ },
    // select:false keeps the hash out of every query unless a controller asks for it with .select("+password").
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "alumni", "admin"], default: "student" },
    department: { type: String, default: "", trim: true },
    batch: { type: String, default: "", trim: true },
    skills: { type: [String], default: [] },
    bio: { type: String, default: "", trim: true, maxlength: 2000 },
    headline: { type: String, default: "", trim: true, maxlength: 160 },
    company: { type: String, default: "", trim: true, maxlength: 160 },
    linkedin: { type: String, default: "", trim: true, maxlength: 500 },
    experience: { type: Number, default: 0, min: 0 },
    // Defaults are important for new users; query code also treats missing legacy values as enabled.
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    openToMentor: { type: Boolean, default: true },
    profileImage: { type: String, default: "", trim: true },
  },
  { timestamps: true, minimize: false }
);

userSchema.index({ role: 1, isVerified: 1, isActive: 1 });
userSchema.index({ registerNumber: 1 }, { unique: true, sparse: true });

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    ret.id = String(ret._id);
    ret.isActive = ret.isActive !== false;
    ret.openToMentor = ret.openToMentor !== false;
    ret.skills = Array.isArray(ret.skills) ? ret.skills : [];
    return ret;
  },
});

userSchema.methods.toSafe = function toSafe() {
  const o = this.toObject();
  delete o.password;
  o.id = String(o._id);
  // Normalize legacy records created before these fields existed.
  o.isActive = o.isActive !== false;
  o.openToMentor = o.openToMentor !== false;
  o.skills = Array.isArray(o.skills) ? o.skills : [];
  return o;
};

userSchema.statics.activeFilter = () => ({ isActive: { $ne: false } });

module.exports = mongoose.model("User", userSchema);
