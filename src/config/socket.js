const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

let io = null;

const initSocket = (server) => {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://medigo-frontend-ebon.vercel.app",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
          callback(null, true);
        } else {
          callback(new Error(`Not allowed by CORS: ${origin}`));
        }
      },
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error("Authentication error: Token is missing"));
      }

      const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      if (!user.isVerified) {
        return next(new Error("Authentication error: Account is not verified"));
      }

      // Attach user details to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error("[Socket.IO Auth Error]:", error.message);
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.user.role || "patient";
    
    // Join a room specific to this user ID so we can target emits to them
    socket.join(`user_${userId}`);
    console.log(`[Socket.IO] Client connected: user ${userId} (${role}). Socket ID: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: user ${userId}. Socket ID: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized. Call initSocket first.");
  }
  return io;
};

module.exports = {
  initSocket,
  getIO,
};
