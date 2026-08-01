const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { sendDoctorInviteEmail, sendDoctorCredentialsEmail } = require("../utils/emailService");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const formatZodError = (error) => {
  const issues = error.issues || error.errors || [];
  return issues.map((err) => err.message).join(", ");
};

const registerClinicSchema = z.object({
  clinicName: z.string().min(2, { message: "Clinic name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms",
  }),
});

const loginClinicSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const inviteDoctorSchema = z.object({
  fullName: z.string().min(2, { message: "Doctor name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  category: z.string().min(1, { message: "Category / specialty is required" }),
  education: z.string().min(1, { message: "Education is required" }),
  availableDays: z.array(z.string()).min(1, { message: "Select at least one available day" }),
  availableSlots: z.array(z.string()).min(1, { message: "Select at least one time slot" }),
  experience: z.preprocess((val) => Number(val) || 0, z.number()).optional(),
});

const setPasswordSchema = z.object({
  token: z.string().min(1, { message: "Invite token is required" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

const issueTokens = async (user) => {
  const token = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshToken = refreshToken;
  await user.save();
  return {
    token,
    refreshToken,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      clinicName: user.clinicName || user.fullName,
    },
  };
};

// Register a clinic account (role: clinic) on the same User collection
const registerClinic = async (req, res) => {
  try {
    const data = registerClinicSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      fullName: data.clinicName,
      clinicName: data.clinicName,
      email,
      password: hashedPassword,
      phone: data.phone,
      agreeTerms: true,
      isVerified: true,
      role: "clinic",
      dob: null,
    });

    const auth = await issueTokens(user);

    return res.status(201).json({
      message: "Clinic registered successfully",
      ...auth,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: formatZodError(error) });
    }
    console.error("Register Clinic Error:", error);
    return res.status(500).json({ message: "Server error during clinic registration" });
  }
};

// Clinic login (email + password → JWT, no SMS OTP)
const loginClinic = async (req, res) => {
  try {
    const data = loginClinicSchema.parse(req.body);
    const user = await User.findOne({ email: data.email.toLowerCase(), role: "clinic" });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Clinic account is not active" });
    }

    const auth = await issueTokens(user);

    return res.status(200).json({
      message: "Login successful",
      ...auth,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: formatZodError(error) });
    }
    console.error("Login Clinic Error:", error);
    return res.status(500).json({ message: "Server error during clinic login" });
  }
};

// Clinic adds a doctor — stored on User with role doctor + clinicId; credentials sent via email & SMS
const inviteDoctor = async (req, res) => {
  try {
    if (req.user.role !== "clinic") {
      return res.status(403).json({ message: "Only clinic accounts can add doctors" });
    }

    const data = inviteDoctorSchema.parse(req.body);
    const email = data.email.toLowerCase();

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenExpires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.isVerified && existing.role !== "doctor") {
        return res.status(400).json({ message: "This email is already registered" });
      }
      // Allow updates/re-credentialing for doctor under this clinic
      if (existing.role === "doctor" && existing.clinicId?.toString() === req.user._id.toString()) {
        existing.fullName = data.fullName;
        existing.phone = data.phone;
        existing.category = data.category;
        existing.education = data.education;
        existing.experience = data.experience || 0;
        existing.availableDays = data.availableDays;
        existing.availableSlots = data.availableSlots;
        existing.password = null; // reset password until they set it
        existing.isVerified = false; // mark unverified until they set password
        existing.inviteToken = inviteToken;
        existing.inviteTokenExpires = inviteTokenExpires;
        await existing.save();

        const inviteLink = `${FRONTEND_URL}/set-password?token=${inviteToken}`;
        const emailResult = await sendDoctorInviteEmail({
          to: email,
          doctorName: data.fullName,
          clinicName: req.user.clinicName || req.user.fullName,
          inviteLink,
        });

        let responseMsg = "Doctor updated. Invitation link sent to their email.";
        if (emailResult.loggedOnly) {
          responseMsg = "Doctor updated. Invitation link generated.";
        }

        return res.status(200).json({
          message: responseMsg,
          inviteLink,
          doctor: {
            id: existing._id,
            fullName: existing.fullName,
            email: existing.email,
            phone: existing.phone,
            category: existing.category,
            education: existing.education,
            availableDays: existing.availableDays,
            availableSlots: existing.availableSlots,
            isVerified: existing.isVerified,
          },
        });
      }
      return res.status(400).json({ message: "This email is already registered" });
    }

    const doctor = await User.create({
      fullName: data.fullName,
      email,
      phone: data.phone,
      password: null,
      role: "doctor",
      clinicId: req.user._id,
      category: data.category,
      education: data.education,
      experience: data.experience || 0,
      availableDays: data.availableDays,
      availableSlots: data.availableSlots,
      agreeTerms: false,
      isVerified: false,
      inviteToken,
      inviteTokenExpires,
      dob: null,
    });

    const inviteLink = `${FRONTEND_URL}/set-password?token=${inviteToken}`;
    const emailResult = await sendDoctorInviteEmail({
      to: email,
      doctorName: data.fullName,
      clinicName: req.user.clinicName || req.user.fullName,
      inviteLink,
    });

    let responseMsg = "Doctor invited successfully. Invitation link sent to their email.";
    if (emailResult.loggedOnly) {
      responseMsg = "Doctor invited successfully. Invitation link generated.";
    }

    return res.status(201).json({
      message: responseMsg,
      inviteLink,
      doctor: {
        id: doctor._id,
        fullName: doctor.fullName,
        email: doctor.email,
        phone: doctor.phone,
        category: doctor.category,
        education: doctor.education,
        availableDays: doctor.availableDays,
        availableSlots: doctor.availableSlots,
        isVerified: doctor.isVerified,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: formatZodError(error) });
    }
    console.error("Invite Doctor Error:", error);
    return res.status(500).json({ message: "Server error inviting doctor" });
  }
};

// Doctor sets password from invite link → activates account on User collection
const setDoctorPassword = async (req, res) => {
  try {
    const data = setPasswordSchema.parse(req.body);

    const doctor = await User.findOne({
      inviteToken: data.token,
      role: "doctor",
      inviteTokenExpires: { $gt: new Date() },
    });

    if (!doctor) {
      return res.status(400).json({ message: "Invalid or expired invite link" });
    }

    doctor.password = await bcrypt.hash(data.password, 10);
    doctor.isVerified = true;
    doctor.agreeTerms = true;
    doctor.inviteToken = null;
    doctor.inviteTokenExpires = null;
    await doctor.save();

    return res.status(200).json({
      message: "Password set successfully. You can now sign in.",
      email: doctor.email,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: formatZodError(error) });
    }
    console.error("Set Doctor Password Error:", error);
    return res.status(500).json({ message: "Server error setting password" });
  }
};

// Validate invite token (for set-password page preload)
const validateInviteToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const doctor = await User.findOne({
      inviteToken: token,
      role: "doctor",
      inviteTokenExpires: { $gt: new Date() },
    }).select("fullName email category clinicId");

    if (!doctor) {
      return res.status(400).json({ valid: false, message: "Invalid or expired invite link" });
    }

    return res.status(200).json({
      valid: true,
      fullName: doctor.fullName,
      email: doctor.email,
      category: doctor.category,
    });
  } catch (error) {
    console.error("Validate Invite Token Error:", error);
    return res.status(500).json({ message: "Server error validating invite" });
  }
};

// List doctors belonging to this clinic
const getClinicDoctors = async (req, res) => {
  try {
    if (req.user.role !== "clinic") {
      return res.status(403).json({ message: "Only clinic accounts can view clinic doctors" });
    }

    const doctors = await User.find({ role: "doctor", clinicId: req.user._id })
      .select("-password -refreshToken -otpCode -otpExpires -inviteToken")
      .sort({ createdAt: -1 });

    return res.status(200).json(doctors);
  } catch (error) {
    console.error("Get Clinic Doctors Error:", error);
    return res.status(500).json({ message: "Server error fetching clinic doctors" });
  }
};

// Appointments for all doctors under this clinic
const getClinicAppointments = async (req, res) => {
  try {
    if (req.user.role !== "clinic") {
      return res.status(403).json({ message: "Only clinic accounts can view clinic appointments" });
    }

    const appointments = await Appointment.find({ clinicId: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Get Clinic Appointments Error:", error);
    return res.status(500).json({ message: "Server error fetching clinic appointments" });
  }
};

// Remove a doctor belonging to this clinic
const removeDoctor = async (req, res) => {
  try {
    if (req.user.role !== "clinic") {
      return res.status(403).json({ message: "Only clinic accounts can remove doctors" });
    }

    const { id } = req.params;
    const doctor = await User.findOne({ _id: id, role: "doctor", clinicId: req.user._id });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found or does not belong to this clinic" });
    }

    await User.deleteOne({ _id: id });

    return res.status(200).json({ message: "Doctor removed successfully" });
  } catch (error) {
    console.error("Remove Doctor Error:", error);
    return res.status(500).json({ message: "Server error removing doctor" });
  }
};

module.exports = {
  registerClinic,
  loginClinic,
  inviteDoctor,
  setDoctorPassword,
  validateInviteToken,
  getClinicDoctors,
  getClinicAppointments,
  removeDoctor,
};
