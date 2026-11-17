
const express = require("express");
const router = express.Router();

const cvController = require("../controllers/cvController");
const {
  authenticateToken,
  authorizeRole
} = require("../middleware/authMiddleware");

router.use(authenticateToken);
router.use(authorizeRole("STUDENT"));

router.post("/", cvController.create);
router.get("/", cvController.getMine);
router.get("/:id", cvController.getById);
router.put("/:id", cvController.update);
router.delete("/:id", cvController.remove);

module.exports = router;
