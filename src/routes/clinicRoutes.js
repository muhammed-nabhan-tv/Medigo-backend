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
  getClinicPatients,
  getClinicPatientProfile,
  getClinicDoctorProfile,
  getClinicPrescriptions,
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
router.get("/doctors/:id", authenticateJWT, getClinicDoctorProfile);
router.delete("/doctors/:id", authenticateJWT, removeDoctor);
router.get("/appointments", authenticateJWT, getClinicAppointments);
router.get("/patients", authenticateJWT, getClinicPatients);
router.get("/patients/:id", authenticateJWT, getClinicPatientProfile);
router.get("/prescriptions", authenticateJWT, getClinicPrescriptions);

module.exports = router;
