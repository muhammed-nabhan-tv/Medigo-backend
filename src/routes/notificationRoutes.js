const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middlewares/authMiddleware");
const Notification = require("../models/Notification");
const { registerClient, removeClient } = require("../utils/notificationService");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 1. Establish SSE live notifications stream connection
// We use the query parameter ?token=... for authentication since EventSource doesn't support custom headers.
router.get("/stream", async (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ message: "Access denied. Token is missing." });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "Access denied. User not found." });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Access denied. Account is not verified." });
    }

    // Configure headers for EventStream
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*", // ensure CORS works for cross-origin local hosts
    });

    // Send connection established event
    res.write("event: ping\ndata: connection established\n\n");

    const userId = user._id;
    registerClient(userId, res);

    // Clean up on client disconnect
    req.on("close", () => {
      removeClient(userId, res);
    });
  } catch (error) {
    console.error("SSE stream authentication error:", error);
    return res.status(401).json({ message: "Access denied. Invalid token." });
  }
});

// 2. Get user's notifications (recent 50)
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({ message: "Server error fetching notifications" });
  }
});

// 3. Mark all user's notifications as read
router.put("/mark-read", authenticateJWT, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return res.status(200).json({ message: "Notifications successfully marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ message: "Server error marking notifications read" });
  }
});

// 4. Mark a specific notification as read
router.put("/:id/mark-read", authenticateJWT, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json(notification);
  } catch (error) {
    console.error("Mark single read error:", error);
    return res.status(500).json({ message: "Server error marking notification read" });
  }
});

module.exports = router;
