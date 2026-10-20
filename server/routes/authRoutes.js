const express = require("express");

const {
    registerUser,
    loginUser,
    changePassword
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.put("/password", protect, changePassword);

router.get("/me", protect, (req, res) => {
    res.json({ user: req.user.toSafe() });
});

module.exports = router;