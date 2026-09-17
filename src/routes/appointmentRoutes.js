const express = require("express");
const router = express.Router();
const {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  addPrescription,
  getAppointmentById,
  getPatientHistoryForDoctor,
  markAppointmentAttended,
  uploadTestReport,
  getTestReportFile,
  reviewTestReport,
  getDoctorTokens,
} = require("../controllers/appointmentController");
const authenticateJWT = require("../middlewares/authMiddleware");

// Public route to view doctor's active tokens and capacity for a date
router.get("/doctor-tokens", getDoctorTokens);

// All subsequent appointment routes require authentication
router.use(authenticateJWT);

router.post("/", createAppointment);
router.get("/patient", getPatientAppointments);
router.get("/doctor", getDoctorAppointments);
router.get("/patient-history/:patientId", getPatientHistoryForDoctor);
router.get("/:id", getAppointmentById);
router.put("/:id/status", updateAppointmentStatus);
router.put("/:id/attend", markAppointmentAttended);
router.put("/:id/prescription", addPrescription);

// Diagnostic test report upload & clinical review
router.post("/:id/tests/:testIndex/report", uploadTestReport);
router.get("/:id/tests/:testIndex/file", getTestReportFile);
router.put("/:id/tests/:testIndex/review", reviewTestReport);

module.exports = router;
