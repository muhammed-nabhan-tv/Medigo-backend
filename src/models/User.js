const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
    },
    dob: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    agreeTerms: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "clinic"],
      default: "patient",
    },
    // Clinic that invited / owns this doctor (User._id with role clinic)
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Display name for clinic accounts (mirrors fullName for clarity)
    clinicName: {
      type: String,
      default: null,
    },
    // Clinic / Doctor physical address & location details
    address: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    // Doctor invite / password-set flow
    inviteToken: {
      type: String,
      default: null,
    },
    inviteTokenExpires: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      default: null,
    },
    education: {
      type: String,
      default: null,
    },
    experience: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    availableDays: {
      type: [String],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    availableSlots: {
      type: [String],
      default: ["09:00 AM", "10:00 AM", "11:30 AM", "01:30 PM", "02:00 PM", "03:30 PM", "04:30 PM"],
    },
    weeklySchedule: [
      {
        day: { type: String, required: true },
        isActive: { type: Boolean, default: true },
        startTime: { type: String, default: "10:00 AM" },
        endTime: { type: String, default: "03:00 PM" },
        consultationDuration: { type: Number, default: 15 },
        breaks: [
          {
            startTime: { type: String, default: "12:30 PM" },
            endTime: { type: String, default: "01:00 PM" },
          },
        ],
        tokens: [
          {
            tokenNumber: { type: Number, required: true },
            startTime: { type: String, required: true },
            endTime: { type: String, required: true },
            displayTime: { type: String, required: true },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
