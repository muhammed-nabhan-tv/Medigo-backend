require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// We'll define a database connection locally inside seed script to be independent
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected for Seeding: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const doctors = [
  {
    fullName: "Dr. Sarah Jenkins, MD",
    email: "sarah.jenkins@medigo.com",
    phone: "6238692051", // Set to a standard number for test logins
    dob: "1984-06-15",
    agreeTerms: true,
    isVerified: true,
    role: "doctor",
    category: "General Medicine",
    education: "MD, Harvard Medical School",
    experience: 14,
    rating: 4.9,
    availableDays: ["Monday", "Wednesday", "Friday"],
    availableSlots: ["09:00 AM", "10:00 AM", "11:30 AM", "02:00 PM", "03:30 PM"],
  },
  {
    fullName: "Dr. Michael Chen, MD",
    email: "michael.chen@medigo.com",
    phone: "7345678901",
    dob: "1978-09-22",
    agreeTerms: true,
    isVerified: true,
    role: "doctor",
    category: "Cardiology",
    education: "MD, Stanford University School of Medicine",
    experience: 18,
    rating: 5.0,
    availableDays: ["Tuesday", "Thursday"],
    availableSlots: ["10:00 AM", "11:00 AM", "01:30 PM", "02:30 PM", "04:00 PM"],
  },
  {
    fullName: "Dr. Amanda Ross, MD",
    email: "amanda.ross@medigo.com",
    phone: "8456789012",
    dob: "1988-03-10",
    agreeTerms: true,
    isVerified: true,
    role: "doctor",
    category: "Pediatrics",
    education: "MD, Johns Hopkins University School of Medicine",
    experience: 8,
    rating: 4.8,
    availableDays: ["Monday", "Tuesday", "Thursday"],
    availableSlots: ["09:30 AM", "10:30 AM", "01:00 PM", "02:00 PM", "03:00 PM"],
  },
  {
    fullName: "Dr. David Kim, MD",
    email: "david.kim@medigo.com",
    phone: "9567890123",
    dob: "1982-11-04",
    agreeTerms: true,
    isVerified: true,
    role: "doctor",
    category: "Neurology",
    education: "MD, UCSF School of Medicine",
    experience: 15,
    rating: 4.7,
    availableDays: ["Wednesday", "Friday"],
    availableSlots: ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM"],
  },
  {
    fullName: "Dr. Elena Rostova, PhD",
    email: "elena.rostova@medigo.com",
    phone: "6543210987",
    dob: "1980-01-30",
    agreeTerms: true,
    isVerified: true,
    role: "doctor",
    category: "Dermatology",
    education: "MD, PhD, University of Pennsylvania Perelman School of Medicine",
    experience: 16,
    rating: 4.9,
    availableDays: ["Monday", "Wednesday", "Thursday"],
    availableSlots: ["08:30 AM", "10:00 AM", "11:30 AM", "01:30 PM", "03:00 PM", "04:30 PM"],
  },
];

const seedDB = async () => {
  await connectDB();
  try {
    // Delete existing seeded doctors (but leave patients intact)
    const result = await User.deleteMany({ role: "doctor" });
    console.log(`Deleted ${result.deletedCount} existing doctor users.`);

    const hashedPassword = await bcrypt.hash("password123", 10);

    const doctorsWithPasswords = doctors.map((doc) => ({
      ...doc,
      password: hashedPassword,
    }));

    await User.insertMany(doctorsWithPasswords);
    console.log(`Successfully seeded ${doctors.length} doctors!`);
  } catch (error) {
    console.error(`Error Seeding Database: ${error.message}`);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
};

seedDB();
