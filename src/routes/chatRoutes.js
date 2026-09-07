const express = require("express");
const router = express.Router();
const { bookingChat } = require("../controllers/chatController");
const optionalAuth = require("../middlewares/optionalAuthMiddleware");

// Chatbot routes support both guests and authenticated patients
router.post("/booking", optionalAuth, bookingChat);

module.exports = router;
