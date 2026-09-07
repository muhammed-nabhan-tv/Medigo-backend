const webpush = require("web-push");

const publicKey = process.env.VAPID_PUBLIC_KEY || "BDj3HPOVA5FgEwHOF2bi_Kdf-Cd40BnB2F0K5FQdax1BJ7yJKJcNdVcW42626qK4ShDQcCL4vdUsWn_-nhFPVXA";
const privateKey = process.env.VAPID_PRIVATE_KEY || "gug4RGk5kVlsaBvuJ8N8DtoENUMHoSbIo8RXpTr5oDk";
const subject = process.env.VAPID_SUBJECT || "mailto:support@medigo.health";

try {
  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log("[Web Push] VAPID configuration initialized successfully");
} catch (err) {
  console.error("[Web Push] VAPID initialization error:", err.message);
}

module.exports = {
  webpush,
  publicKey,
};
