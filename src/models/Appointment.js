const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    doctorName: {
      type: String,
      required: true,
    },
    specialty: {
      type: String,
      default: "General Medicine",
    },
    patientName: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: "Video Consultation",
    },
    reason: {
      type: String,
      default: "General Checkup",
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Confirmed",
    },
    prescription: {
      doctorName: { type: String, default: null },
      doctorDegree: { type: String, default: null },
      clinicName: { type: String, default: null },
      clinicAddress: { type: String, default: null },
      clinicPhone: { type: String, default: null },
      patientAge: { type: String, default: null },
      patientSex: { type: String, default: null },
      rxId: { type: String, default: null },
      date: { type: String, default: null },
      medicines: [
        {
          name: { type: String, required: true },
          frequency: { type: String, default: "" },
          duration: { type: String, default: "" },
          instruction: { type: String, default: "" },
        }
      ],
      advice: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
