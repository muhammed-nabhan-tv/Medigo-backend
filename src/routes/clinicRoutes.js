const express = require("express");
const router = express.Router();
const {
  registerClinic,
  loginClinic,
  inviteDoctor,
  setDoctorPassword,
  validateInviteToken,
  getClinicDoctors,
  getClinicAppointments,
  removeDoctor,
} = require("../controllers/clinicController");
const authenticateJWT = require("../middlewares/authMiddleware");

// Public clinic auth
router.post("/register", registerClinic);
router.post("/login", loginClinic);

// Doctor invite password flow (public)
router.get("/invite/validate", validateInviteToken);
router.post("/set-password", setDoctorPassword);

// Clinic-protected
router.post("/doctors", authenticateJWT, inviteDoctor);
router.get("/doctors", authenticateJWT, getClinicDoctors);
router.delete("/doctors/:id", authenticateJWT, removeDoctor);
router.get("/appointments", authenticateJWT, getClinicAppointments);

module.exports = router;
