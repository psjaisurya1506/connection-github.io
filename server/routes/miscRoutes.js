const router = require("express").Router();
const { protect, authorize } = require("../middleware/auth");
const c = require("../controllers/miscController");

// protect is applied per route (not router.use) so unknown /api/... paths fall through to a clean JSON 404.
router.get("/dashboard/stats", protect, c.stats);
router.get("/notifications", protect, c.notifications);
router.patch("/notifications/read-all", protect, c.readAll);

router.get("/admin/users", protect, authorize("admin"), c.listUsers);
router.patch("/admin/users/:id/verify", protect, authorize("admin"), c.verifyUser);
router.patch("/admin/users/:id/role", protect, authorize("admin"), c.setUserRole);
router.patch("/admin/users/:id/active", protect, authorize("admin"), c.setActive);

module.exports = router;
