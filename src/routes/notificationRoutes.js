const express = require("express");
const router = express.Router();
const authenticateJWT = require("../middlewares/authMiddleware");
const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const { publicKey } = require("../config/vapid");
const { sendWebPushToUser } = require("../utils/notificationService");

// 1. Get VAPID Public Key for Web Push (Public)
router.get("/vapid-public-key", (req, res) => {
  return res.status(200).json({ publicKey });
});

// 2. Register / Update a Web Push subscription
router.post("/subscribe", authenticateJWT, async (req, res) => {
  try {
    const { subscription, userAgent } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: "Invalid push subscription object" });
    }

    const { endpoint, keys } = subscription;
    if (!keys.p256dh || !keys.auth) {
      return res.status(400).json({ message: "Subscription missing cryptographic keys" });
    }

    // Upsert subscription for user and endpoint
    const existingSub = await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        userId: req.user._id,
        endpoint,
        keys: {
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        userAgent: userAgent || "",
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Push notification subscription registered successfully",
      subscriptionId: existingSub._id,
    });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return res.status(500).json({ message: "Server error registering push subscription" });
  }
});

// 3. Unregister a Web Push subscription
router.post("/unsubscribe", authenticateJWT, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint required" });
    }

    await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
    return res.status(200).json({ message: "Push notification subscription removed" });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return res.status(500).json({ message: "Server error removing push subscription" });
  }
});

// 4. Send a test push notification to user's registered devices
router.post("/test", authenticateJWT, async (req, res) => {
  try {
    await sendWebPushToUser(req.user._id, {
      title: "Medigo Health Alert",
      body: "Test notification: Web Push is connected and working seamlessly!",
      type: "general",
      link: "/profile",
      id: "test-" + Date.now(),
    });

    return res.status(200).json({ message: "Test push notification sent to your devices!" });
  } catch (error) {
    console.error("Test push error:", error);
    return res.status(500).json({ message: "Failed to dispatch test push notification" });
  }
});

// 5. Get user's notifications (recent 50)
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

// 6. Mark all user's notifications as read
router.put("/mark-read", authenticateJWT, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return res.status(200).json({ message: "Notifications successfully marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ message: "Server error marking notifications read" });
  }
});

// 7. Mark a specific notification as read
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
