const jwt = require("jsonwebtoken");
const User = require("../models/User");

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      req.user = user || null;
    } catch (err) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = optionalAuth;
