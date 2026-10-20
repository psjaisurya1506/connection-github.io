const router = require("express").Router();
const { protect, authorize, requireVerifiedAlumni } = require("../middleware/auth");
const c = require("../controllers/requestController");

router.use(protect);
router.post("/", authorize("student"), c.create);
router.post("/peer", authorize("alumni"), requireVerifiedAlumni, c.createPeer);
router.get("/", authorize("student", "alumni"), c.listMine);
router.patch("/:id/respond", authorize("alumni"), requireVerifiedAlumni, c.respond);
router.patch("/:id/complete", authorize("alumni"), requireVerifiedAlumni, c.complete);
router.patch("/:id/cancel", authorize("student", "alumni"), c.cancel);

module.exports = router;
