const User = require("../models/User");
const HttpError = require("../utils/httpError");
const asyncHandler = require("../utils/asyncHandler");
const { verify } = require("../utils/token");

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Not authenticated");
  let payload;
  try {
    payload = verify(token);
  } catch {
    throw new HttpError(401, "Session expired, please sign in again");
  }
  const user = await User.findById(payload.id).select("-password");
  if (!user || user.isActive === false) throw new HttpError(401, "Account not available");
  req.user = user;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, "You do not have access to this resource"));
  next();
};

// Alumni must be approved by an admin before they can mentor or post jobs.
const requireVerifiedAlumni = (req, res, next) => {
  if (req.user.role === "alumni" && !req.user.isVerified)
    return next(new HttpError(403, "Your alumni account is awaiting admin verification"));
  next();
};

module.exports = { protect, authorize, requireVerifiedAlumni };
