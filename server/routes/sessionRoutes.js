const router = require("express").Router();
const { protect, authorize, requireVerifiedAlumni } = require("../middleware/auth");
const c = require("../controllers/sessionController");

router.use(protect, authorize("student", "alumni"), requireVerifiedAlumni);
router.post("/", c.create);
router.get("/", c.listMine);
router.patch("/:id/status", c.setStatus);

module.exports = router;
