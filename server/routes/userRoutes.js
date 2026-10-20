const router = require("express").Router();
const { protect, authorize, requireVerifiedAlumni } = require("../middleware/auth");
const c = require("../controllers/userController");

router.use(protect);
router.get("/mentors", c.listMentors);
router.get("/peers", authorize("alumni"), requireVerifiedAlumni, c.listPeers);
router.get("/filters", c.mentorFilters);
router.put("/me", c.updateMe);
router.get("/:id", c.getProfile);

module.exports = router;
