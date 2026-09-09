require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const clinicRoutes = require("./routes/clinicRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const chatRoutes = require("./routes/chatRoutes");
const medicalRoutes = require("./routes/medicalRoutes");
const { startReminderScheduler } = require("./utils/reminderScheduler");

const http = require("http");
const { initSocket } = require("./config/socket");

// Connect to MongoDB Database
connectDB().then((isConnected) => {
  if (isConnected) {
    // Start the background reminder scheduler only when DB is connected
    startReminderScheduler();
  } else {
    console.warn("[Reminder Scheduler] Database is disconnected. Reminder scheduler will not run in offline mode.");
  }
});

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Allowed CORS origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://medigo-frontend-ebon.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Routes Mounts
app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/medical", medicalRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.send("Medigo API is running smoothly...");
});

// Listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

