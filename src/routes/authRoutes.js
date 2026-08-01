const express = require("express");
const router = express.Router();
const { register, login, getProfile, refresh, verifyOTP, resendOTP, logout, getDoctors } = require("../controllers/authController");
const authenticateJWT = require("../middlewares/authMiddleware");

// Authentication Endpoints
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", authenticateJWT, getProfile);
router.get("/doctors", getDoctors);

module.exports = router;
