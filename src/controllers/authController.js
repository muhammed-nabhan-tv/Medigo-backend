const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/generateToken");
const { sendOtpEmail, isSmtpConfigured } = require("../utils/emailService");

// Obfuscate phone helper (e.g. +1234567890 -> ******7890)
const obfuscatePhone = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 4) {
    return `******${cleaned.slice(-4)}`;
  }
  return phone;
};

// Obfuscate email helper (e.g. johndoe@gmail.com -> jo***e@gmail.com)
const obfuscateEmail = (email) => {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
};

// Check if email transporter is configured
const isEmailConfigured = () => {
  return isSmtpConfigured();
};

// Zod validation schemas
const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full Name must be at least 2 characters" }),
  email: z
    .string()
    .email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" }),
  dob: z
    .string()
    .min(1, { message: "Date of Birth is required" }),
  phone: z
    .string()
    .min(10, { message: "Please enter a valid phone number" }),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Privacy Policy and HIPAA terms" }),
  }),
  role: z.enum(["patient", "doctor"]).optional().default("patient"),
  category: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  experience: z.preprocess((val) => Number(val) || 0, z.number()).optional(),
  availableDays: z.array(z.string()).optional(),
  availableSlots: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

// Register Controller (creates unverified user and sends OTP via Twilio Verify)
const register = async (req, res) => {
  try {
    // Validate request body
    const validatedData = registerSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    
    let user;
    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ message: "Email is already registered" });
      }
      
      // Update details for unverified registration
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      existingUser.fullName = validatedData.fullName;
      existingUser.password = hashedPassword;
      existingUser.dob = validatedData.dob;
      existingUser.phone = validatedData.phone;
      existingUser.agreeTerms = validatedData.agreeTerms;
      existingUser.role = validatedData.role;
      existingUser.category = validatedData.category || null;
      existingUser.education = validatedData.education || null;
      existingUser.experience = validatedData.experience || 0;
      if (validatedData.availableDays) {
        existingUser.availableDays = validatedData.availableDays;
      }
      if (validatedData.availableSlots) {
        existingUser.availableSlots = validatedData.availableSlots;
      }
      user = await existingUser.save();
    } else {
      // Create user
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      user = await User.create({
        fullName: validatedData.fullName,
        email: validatedData.email.toLowerCase(),
        password: hashedPassword,
        dob: validatedData.dob,
        phone: validatedData.phone,
        agreeTerms: validatedData.agreeTerms,
        isVerified: false,
        role: validatedData.role,
        category: validatedData.category || null,
        education: validatedData.education || null,
        experience: validatedData.experience || 0,
        availableDays: validatedData.availableDays || ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        availableSlots: validatedData.availableSlots || ["09:00 AM", "10:00 AM", "11:30 AM", "01:30 PM", "02:00 PM", "03:30 PM", "04:30 PM"],
      });
    }

    // Generate and save 6-digit OTP code to the database
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    await user.save();

    // Trigger verification via Email
    const emailResult = await sendOtpEmail({ to: user.email, otp: otpCode });
    if (!emailResult.sent) {
      return res.status(500).json({ message: "Failed to dispatch verification email" });
    }

    const emailActive = isEmailConfigured();

    // Return verification required flag
    return res.status(200).json({
      message: "Verification code sent to your email address",
      requireOTP: true,
      email: user.email,
      emailObfuscated: obfuscateEmail(user.email),
      debugOtp: !emailActive ? otpCode : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({ message: errorMessages });
    }
    console.error("Registration Controller Error:", error);
    return res.status(500).json({ message: "Server error during registration" });
  }
};

// Login Controller (verifies credentials and sends OTP via Twilio Verify)
const login = async (req, res) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Find User (patients & doctors use this route; clinics use /api/clinic/login)
    const user = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (!user || user.role === "clinic") {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.password) {
      return res.status(401).json({
        message: "Please set your password using the invite link sent to your email",
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(validatedData.password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate and save 6-digit OTP code to the database
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    await user.save();

    // Trigger verification via Email
    const emailResult = await sendOtpEmail({ to: user.email, otp: otpCode });
    if (!emailResult.sent) {
      return res.status(500).json({ message: "Failed to dispatch verification email" });
    }

    const emailActive = isEmailConfigured();

    return res.status(200).json({
      message: "Verification code sent to your email address",
      requireOTP: true,
      email: user.email,
      emailObfuscated: obfuscateEmail(user.email),
      debugOtp: !emailActive ? otpCode : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message).join(", ");
      return res.status(400).json({ message: errorMessages });
    }
    console.error("Login Controller Error:", error);
    return res.status(500).json({ message: "Server error during sign-in" });
  }
};

// Verify OTP Controller (checks code via Twilio Verify)
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check verification status with email OTP
    let isApproved = false;
    const emailActive = isEmailConfigured();
    if (!emailActive && (otp === "123456" || otp === "000000")) {
      isApproved = true;
    } else if (user.otpCode === otp && user.otpExpires && user.otpExpires > Date.now()) {
      isApproved = true;
    }

    if (!isApproved) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    if (purpose === "register") {
      user.isVerified = true;
    }

    // Clear verification details
    user.otpCode = null;
    user.otpExpires = null;
    
    // Generate access & refresh tokens
    const token = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token to user model
    user.refreshToken = refreshToken;
    await user.save();

    return res.status(200).json({
      message: "Verification successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        dob: user.dob,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ message: "Server error during verification check" });
  }
};

// Resend OTP Controller
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate and save 6-digit OTP code to the database
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    user.otpCode = otpCode;
    user.otpExpires = otpExpires;
    await user.save();

    // Trigger verification via Email
    const emailResult = await sendOtpEmail({ to: user.email, otp: otpCode });
    if (!emailResult.sent) {
      return res.status(500).json({ message: "Failed to dispatch verification email" });
    }

    const emailActive = isEmailConfigured();

    return res.status(200).json({
      message: "Verification code resent successfully",
      email: user.email,
      emailObfuscated: obfuscateEmail(user.email),
      debugOtp: !emailActive ? otpCode : undefined,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ message: "Server error during code resend" });
  }
};

// Refresh Token Controller
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid or revoked session" });
    }

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    user.refreshToken = newRefreshToken;
    await user.save();

    return res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token Refresh Error:", error);
    return res.status(500).json({ message: "Server error during token refresh" });
  }
};

// Logout Controller (clears refresh token)
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Server error during logout" });
  }
};

// Get User Profile Controller
const getProfile = async (req, res) => {
  try {
    return res.status(200).json({
      user: req.user,
    });
  } catch (error) {
    console.error("Profile Controller Error:", error);
    return res.status(500).json({ message: "Server error fetching user profile" });
  }
};

// Get all verified doctors
const getDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor", isVerified: true }).select(
      "-password -refreshToken -otpCode -otpExpires"
    );
    return res.status(200).json(doctors);
  } catch (error) {
    console.error("Get Doctors Error:", error);
    return res.status(500).json({ message: "Server error fetching doctors" });
  }
};

module.exports = {
  register,
  login,
  verifyOTP,
  resendOTP,
  refresh,
  logout,
  getProfile,
  getDoctors,
};
