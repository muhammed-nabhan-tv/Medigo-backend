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
    tokenNumber: {
      type: Number,
      default: null,
    },
    tokenTime: {
      type: String,
      default: null,
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
      tests: [
        {
          name: { type: String, required: true },
          category: { type: String, default: "Diagnostic Test" },
          instructions: { type: String, default: "" },
          notes: { type: String, default: "" },
          reportStatus: {
            type: String,
            enum: ["pending", "uploaded", "reviewed"],
            default: "pending",
          },
          report: {
            fileName: { type: String, default: null },
            fileType: { type: String, default: null },
            fileSize: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: null },
            patientNotes: { type: String, default: "" },
            fileUrl: { type: String, default: null },
          },
          doctorReview: {
            comment: { type: String, default: null },
            reviewedAt: { type: Date, default: null },
            doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            doctorName: { type: String, default: null },
          },
        }
      ],
      advice: { type: String, default: "" },
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    oneHourReminderSent: {
      type: Boolean,
      default: false,
    },
    patientAttended: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent double bookings on the same doctor, date, and time (excluding cancelled)
appointmentSchema.index(
  { doctorId: 1, date: 1, time: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "Cancelled" } } }
);

// Compound unique index to prevent double bookings on the same doctor, date, and tokenNumber (excluding cancelled)
appointmentSchema.index(
  { doctorId: 1, date: 1, tokenNumber: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "Cancelled" }, tokenNumber: { $type: "number" } } }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
