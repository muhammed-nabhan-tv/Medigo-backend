const Notification = require("../models/Notification");
const PushSubscription = require("../models/PushSubscription");
const { getIO } = require("../config/socket");
const { webpush } = require("../config/vapid");

/**
 * Send a notification to a specific user:
 * 1. Saves to DB
 * 2. Emits via Socket.IO if client is online
 * 3. Sends Web Push Notification to all subscribed devices
 */
const createAndSendNotification = async ({ userId, title, message, type, link }) => {
  try {
    // 1. Create notification in database
    const notification = await Notification.create({
      userId,
      title,
      message,
      type: type || "general",
      link: link || null,
    });

    // 2. Push via Socket.IO
    const userIdStr = userId.toString();
    try {
      const io = getIO();
      io.to(`user_${userIdStr}`).emit("notification", notification);
      console.log(`[Notification Service] Successfully pushed live Socket.IO notification to user ${userIdStr}`);
    } catch (socketErr) {
      console.log(`[Notification Service] Socket.IO emit note: ${socketErr.message}`);
    }

    // 3. Send Web Push Notification to active device subscriptions
    try {
      await sendWebPushToUser(userId, {
        title,
        body: message,
        type: type || "general",
        link: link || "/profile",
        id: notification._id.toString(),
      });
    } catch (pushErr) {
      console.error(`[Notification Service] Web Push error for user ${userIdStr}:`, pushErr.message);
    }

    return notification;
  } catch (error) {
    console.error("Error creating/sending notification:", error);
  }
};

/**
 * Dispatches Web Push payload to all PushSubscriptions registered by the user
 */
const sendWebPushToUser = async (userId, payload) => {
  const subscriptions = await PushSubscription.find({ userId });
  if (!subscriptions || subscriptions.length === 0) {
    return;
  }

  const payloadString = JSON.stringify({
    title: payload.title || "Medigo Health Alert",
    body: payload.body || "You have a new update from Medigo.",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: {
      url: payload.link || "/profile",
      type: payload.type || "general",
      notificationId: payload.id,
    },
  });

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };

      await webpush.sendNotification(pushConfig, payloadString);
      console.log(`[Web Push] Successfully delivered push to endpoint: ${sub.endpoint.slice(0, 30)}...`);
    } catch (err) {
      console.error(`[Web Push] Delivery failed for endpoint:`, err.statusCode || err.message);
      // Clean up invalid or expired subscriptions (410 Gone, 404 Not Found)
      if (err.statusCode === 410 || err.statusCode === 404) {
        console.log(`[Web Push] Removing expired subscription ${sub._id}`);
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  });

  await Promise.allSettled(sendPromises);
};

module.exports = {
  createAndSendNotification,
  sendWebPushToUser,
};
