/**
 * Email helper for doctor invite links.
 * Uses SMTP when EMAIL_HOST / EMAIL_USER / EMAIL_PASS are set;
 * otherwise logs the message and returns success so local dev still works.
 */

const getCleanEnv = (name) => {
  const value = process.env[name];
  if (!value) return "";
  const cleaned = value.split("#")[0].trim();
  if (cleaned.startsWith("your") || cleaned.includes("placeholder") || cleaned.includes("Add your") || cleaned === "") {
    return "";
  }
  return cleaned;
};

const isSmtpConfigured = () => {
  return !!(getCleanEnv("EMAIL_HOST") && getCleanEnv("EMAIL_USER") && getCleanEnv("EMAIL_PASS"));
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!isSmtpConfigured()) {
    console.log("\n========== EMAIL (SMTP not configured — logged only) ==========");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("================================================================\n");
    return { sent: true, loggedOnly: true };
  }

  try {
    // Lazy-require so the app boots without nodemailer if unused
    const nodemailer = require("nodemailer");
    const emailHost = getCleanEnv("EMAIL_HOST");
    const emailPort = Number(getCleanEnv("EMAIL_PORT")) || 587;
    const emailSecure = getCleanEnv("EMAIL_SECURE") === "true";
    const emailUser = getCleanEnv("EMAIL_USER");
    const emailPass = getCleanEnv("EMAIL_PASS");
    const emailFrom = getCleanEnv("EMAIL_FROM") || `"Medigo" <${emailUser}>`;

    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    await transporter.sendMail({
      from: emailFrom,
      to,
      subject,
      html,
      text,
    });

    console.log(`[SMTP EMAIL] Sent email to ${to} (Subject: ${subject})`);
    return { sent: true, loggedOnly: false };
  } catch (error) {
    console.error("Email send failed:", error.message);
    return { sent: false, loggedOnly: false, error: error.message };
  }
};

const sendDoctorInviteEmail = async ({ to, doctorName, clinicName, inviteLink }) => {
  const subject = `You're invited to join ${clinicName} on Medigo`;
  const text = `Hi ${doctorName},\n\n${clinicName} has added you as a doctor on Medigo.\n\nSet your password using this link (valid for 48 hours):\n${inviteLink}\n\nAfter setting your password you can sign in to your doctor dashboard.\n\n— Medigo`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #059669;">Welcome to Medigo</h2>
      <p>Hi <strong>${doctorName}</strong>,</p>
      <p><strong>${clinicName}</strong> has added you as a doctor on Medigo.</p>
      <p>Click the button below to set your password and activate your account. This link expires in 48 hours.</p>
      <p style="margin: 28px 0;">
        <a href="${inviteLink}" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          Set your password
        </a>
      </p>
      <p style="font-size:13px;color:#64748b;">Or copy this link:<br/>${inviteLink}</p>
      <p style="font-size:13px;color:#64748b;">— The Medigo team</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

const sendDoctorCredentialsEmail = async ({ to, doctorName, clinicName, password }) => {
  const subject = `Welcome to Medigo! Your Doctor Account is Ready`;
  const text = `Congratulations Dr. ${doctorName},\n\n${clinicName} has added you as a doctor on Medigo.\n\nYou can sign in using your credentials:\nEmail: ${to}\nPassword: ${password}\n\nLogin at: ${process.env.FRONTEND_URL || "http://localhost:3000"}\n\n— Medigo`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a;">
      <h2 style="color: #059669;">Congratulations Dr. ${doctorName}!</h2>
      <p>Welcome to Medigo. <strong>${clinicName}</strong> has added you as a doctor.</p>
      <p>Your account is active. You can sign in using these credentials:</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0; font-family: monospace;">
        <strong>Email:</strong> ${to}<br/>
        <strong>Password:</strong> ${password}
      </div>
      <p style="margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          Sign in to Dashboard
        </a>
      </p>
      <p style="font-size:13px;color:#64748b;">— The Medigo team</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

const sendOtpEmail = async ({ to, otp }) => {
  const subject = `Your Medigo Verification Code`;
  const text = `Your Medigo verification code is ${otp}. This code is valid for 10 minutes.`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">Verify your email</h2>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Thank you for using Medigo. Please verify your identity by entering the code below on the verification page. This code is valid for 10 minutes:</p>
      <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; color: #059669;">
        ${otp}
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">If you did not request this code, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">— The Medigo team</p>
    </div>
  `;

  return sendEmail({ to, subject, html, text });
};

module.exports = {
  sendEmail,
  sendDoctorInviteEmail,
  sendDoctorCredentialsEmail,
  sendOtpEmail,
  isSmtpConfigured,
};

