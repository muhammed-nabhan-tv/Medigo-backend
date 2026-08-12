require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const { startReminderScheduler } = require("./utils/reminderScheduler");

// Connect to MongoDB Database
connectDB().then(() => {
  // Start the background reminder scheduler
  startReminderScheduler();
});

const app = express();

// Set Up Global Middlewares
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"], // frontend local dev server
    credentials: true,
  })
);
app.use(express.json());

// Routes Mounts
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Medigo API is running smoothly...");
});

// Listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});
