const Notification = require("../models/Notification");

// Map of userId string -> array of Express response objects
const sseClients = new Map();

/**
 * Register a client for SSE streams
 */
const registerClient = (userId, res) => {
  const userIdStr = userId.toString();
  if (!sseClients.has(userIdStr)) {
    sseClients.set(userIdStr, []);
  }
  sseClients.get(userIdStr).push(res);
  console.log(`[Notification Service] Registered SSE client for user ${userIdStr}. Active connections: ${sseClients.get(userIdStr).length}`);
};

/**
 * Remove a client from SSE streams
 */
const removeClient = (userId, res) => {
  const userIdStr = userId.toString();
  if (sseClients.has(userIdStr)) {
    const clients = sseClients.get(userIdStr);
    const index = clients.indexOf(res);
    if (index !== -1) {
      clients.splice(index, 1);
    }
    if (clients.length === 0) {
      sseClients.delete(userIdStr);
    }
    console.log(`[Notification Service] Unregistered SSE client for user ${userIdStr}. Remaining connections: ${clients ? clients.length : 0}`);
  }
};

/**
 * Send a notification to a specific user (saves to DB and pushes via SSE if online)
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

    // 2. Push via SSE if online
    const userIdStr = userId.toString();
    if (sseClients.has(userIdStr)) {
      const clients = sseClients.get(userIdStr);
      const dataStr = JSON.stringify(notification);
      clients.forEach((res) => {
        // SSE formatting requires data: followed by JSON and double newline
        res.write(`event: notification\n`);
        res.write(`data: ${dataStr}\n\n`);
      });
      console.log(`[Notification Service] Successfully pushed live SSE notification to user ${userIdStr}`);
    }

    return notification;
  } catch (error) {
    console.error("Error creating/sending notification:", error);
  }
};

module.exports = {
  registerClient,
  removeClient,
  createAndSendNotification,
};
