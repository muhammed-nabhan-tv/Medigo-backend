const express = require("express");
const router = express.Router();
const {
  register,
  login,
  getProfile,
  refresh,
  verifyOTP,
  resendOTP,
  logout,
  getDoctors,
  updateProfile,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
} = require("../controllers/authController");
const authenticateJWT = require("../middlewares/authMiddleware");

// Authentication Endpoints
router.post("/register", register);
router.post("/login", login);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOTP);
router.post("/reset-password", resetPassword);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/profile", authenticateJWT, getProfile);
router.put("/profile", authenticateJWT, updateProfile);
router.get("/doctors", getDoctors);

module.exports = router;
