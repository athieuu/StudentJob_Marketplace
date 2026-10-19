
const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    authorizeRole
} = require("../middleware/authMiddleware");

router.get(
    "/student",
    authenticateToken,
    authorizeRole("STUDENT"),
    (req, res) => {
        res.json({
            message: "Truy cập thành công khu vực STUDENT",
            user: req.user
        });
    }
);

router.get(
    "/employer",
    authenticateToken,
    authorizeRole("EMPLOYER"),
    (req, res) => {
        res.json({
            message: "Truy cập thành công khu vực EMPLOYER",
            user: req.user
        });
    }
);

router.get(
    "/admin",
    authenticateToken,
    authorizeRole("ADMIN"),
    (req, res) => {
        res.json({
            message: "Truy cập thành công khu vực ADMIN",
            user: req.user
        });
    }
);

module.exports = router;
