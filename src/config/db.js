const mongoose = require("mongoose");

/**
 * Clean and resolve MongoDB connection URI from environment variables.
 * Handles trailing spaces, accidental quotes, or alternative variable names.
 */
const getCleanMongoUri = () => {
  let uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "";
  uri = uri.trim();

  // Strip accidental enclosing quotes ("..." or '...')
  if (
    (uri.startsWith('"') && uri.endsWith('"')) ||
    (uri.startsWith("'") && uri.endsWith("'"))
  ) {
    uri = uri.slice(1, -1).trim();
  }

  return uri;
};

const connectDB = async () => {
  const uri = getCleanMongoUri();

  if (!uri) {
    console.error("\n================ MONGODB CONFIGURATION ERROR ================");
    console.error("MongoDB Connection Error: No connection string provided.");
    console.error("Neither MONGODB_URI, MONGO_URI, nor DATABASE_URL was found.");
    console.error("Please set MONGODB_URI in your environment variables with a valid connection string.");
    console.error("Example: mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/medigo");
    console.error("=============================================================\n");
    return false;
  }

  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    console.error("\n================ MONGODB SCHEME ERROR ================");
    console.error(`MongoDB Connection Error: Invalid scheme in MONGODB_URI.`);
    console.error(`Received value starting with: "${uri.slice(0, 30)}..."`);
    console.error("Expected connection string to start with 'mongodb://' or 'mongodb+srv://'.");
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      console.error("\nCRITICAL MISCONFIGURATION DETECTED:");
      console.error("Your MONGODB_URI variable is currently set to an HTTP URL (likely your Render backend URL or Vercel URL).");
      console.error("MONGODB_URI must be your MongoDB database URI from MongoDB Atlas (e.g. mongodb+srv://...).");
    }
    console.error("======================================================\n");
    return false;
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Connection lost. Running in disconnected mode.");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Connection re-established successfully.");
  });

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of buffering indefinitely
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log("Express server is running in offline mode (database disconnected).");
    return false;
  }
};

module.exports = connectDB;
