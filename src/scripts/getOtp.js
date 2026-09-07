require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const getOtp = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email: "john.doe.test@medigo.com" });
    if (user) {
      console.log(`OTP Code for ${user.email} is: ${user.otpCode}`);
    } else {
      console.log("User john.doe.test@medigo.com not found in database.");
    }
  } catch (err) {
    console.error("Database connection failed:", err.message);
  } finally {
    await mongoose.connection.close();
  }
};

getOtp();
