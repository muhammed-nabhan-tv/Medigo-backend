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
} = require("../controllers/appointmentController");
const authenticateJWT = require("../middlewares/authMiddleware");

// All appointment routes require authentication
router.use(authenticateJWT);

router.post("/", createAppointment);
router.get("/patient", getPatientAppointments);
router.get("/doctor", getDoctorAppointments);
router.get("/patient-history/:patientId", getPatientHistoryForDoctor);
router.get("/:id", getAppointmentById);
router.put("/:id/status", updateAppointmentStatus);
router.put("/:id/attend", markAppointmentAttended);
router.put("/:id/prescription", addPrescription);

module.exports = router;
