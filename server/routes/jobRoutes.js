const router = require("express").Router();
const { protect, authorize, requireVerifiedAlumni } = require("../middleware/auth");
const c = require("../controllers/jobController");

router.use(protect);
router.get("/", c.list);
router.post("/", authorize("alumni", "admin"), requireVerifiedAlumni, c.create);
router.put("/:id", authorize("alumni", "admin"), requireVerifiedAlumni, c.update);
router.delete("/:id", authorize("alumni", "admin"), requireVerifiedAlumni, c.remove);
router.post("/:id/save", authorize("student"), c.toggleSave);

module.exports = router;
