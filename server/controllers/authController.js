const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { sign } = require("../utils/token");

const safeUser = (user) => (typeof user.toSafe === "function" ? user.toSafe() : (() => {
  const o = user.toObject(); delete o.password; o.id = String(o._id); return o;
})());

const issueToken = sign;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTER_NUMBER_RE = /^31062\d{7}$/;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const registerUser = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = ["student", "alumni"].includes(req.body.role) ? req.body.role : "student";
    const registerNumber = String(req.body.registerNumber || "").trim();

    if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (!REGISTER_NUMBER_RE.test(registerNumber)) return res.status(400).json({ message: "Enter your college register number in the format 31062 followed by 7 digits" });

    const existingUser = await User.findOne({ $or: [{ email }, { registerNumber }] });
    if (existingUser) return res.status(409).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      registerNumber,
      password: hashedPassword,
      role,
      department: String(req.body.department || "").trim(),
      batch: String(req.body.batch || "").trim(),
      isActive: true,
      isVerified: false,
      openToMentor: role === "alumni",
    });

    const token = issueToken(user);
    res.status(201).json({ message: "User registered successfully", token, user: safeUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "User already exists" });
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!email || !password || typeof req.body.email !== "string" || typeof req.body.password !== "string") {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    let passwordOk = await bcrypt.compare(password, user.password).catch(() => false);
    // Compatibility for older demo/legacy records that may contain a plain-text seed password.
    if (!passwordOk && user.password === password) {
      user.password = await bcrypt.hash(password, 10);
      await user.save();
      passwordOk = true;
    }
    if (!passwordOk) return res.status(401).json({ message: "Invalid email or password" });
    if (user.isActive === false) return res.status(403).json({ message: "Your account is deactivated. Contact an administrator." });

    res.json({ message: "Login successful", token: issueToken(user), user: safeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new passwords are required" });
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(400).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { registerUser, loginUser, changePassword };
