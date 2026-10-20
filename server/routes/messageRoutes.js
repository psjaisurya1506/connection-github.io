const router = require("express").Router();
const { protect } = require("../middleware/auth");
const c = require("../controllers/messageController");

router.use(protect);
router.get("/contacts", c.contacts);
router.get("/conversations", c.conversations);
router.get("/:userId", c.thread);
router.post("/:userId", c.send);

module.exports = router;
