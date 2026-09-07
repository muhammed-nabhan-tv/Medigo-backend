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

const sendAppointmentCreatedEmail = async ({ patientEmail, patientName, doctorEmail, doctorName, date, time, type }) => {
  // Send to Patient
  const patientSubject = `Appointment Confirmed: Dr. ${doctorName}`;
  const patientText = `Hi ${patientName},\n\nYour appointment with Dr. ${doctorName} is confirmed.\nDate: ${date}\nTime: ${time}\nType: ${type}\n\nThank you for choosing Medigo!`;
  const patientHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">Appointment Confirmed!</h2>
      <p>Hi <strong>${patientName}</strong>,</p>
      <p>Your consultation request with <strong>Dr. ${doctorName}</strong> is successfully scheduled and confirmed:</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <strong>Specialist:</strong> Dr. ${doctorName}<br/>
        <strong>Date:</strong> ${date}<br/>
        <strong>Time:</strong> ${time}<br/>
        <strong>Session Type:</strong> ${type}
      </div>
      <p>You can access details and join the session from your patient profile dashboard.</p>
      <p style="margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/profile" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Patient Dashboard
        </a>
      </p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
    </div>
  `;
  await sendEmail({ to: patientEmail, subject: patientSubject, html: patientHtml, text: patientText });

  // Send to Doctor
  const doctorSubject = `New Appointment Booked: ${patientName}`;
  const doctorText = `Hi Dr. ${doctorName},\n\nYou have a new appointment scheduled with ${patientName}.\nDate: ${date}\nTime: ${time}\nType: ${type}\n\nPlease check your schedule dashboard.`;
  const doctorHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">New Consultation Booked</h2>
      <p>Hi <strong>Dr. ${doctorName}</strong>,</p>
      <p>Patient <strong>${patientName}</strong> has scheduled a new consultation with you:</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0;">
        <strong>Patient Name:</strong> ${patientName}<br/>
        <strong>Date:</strong> ${date}<br/>
        <strong>Time:</strong> ${time}<br/>
        <strong>Session Type:</strong> ${type}
      </div>
      <p>Please check your schedule dashboard to prepare for the session and write prescriptions.</p>
      <p style="margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/doctor" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Specialist Dashboard
        </a>
      </p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
    </div>
  `;
  await sendEmail({ to: doctorEmail, subject: doctorSubject, html: doctorHtml, text: doctorText });
};

const sendAppointmentCancelledEmail = async ({ toEmail, recipientName, otherPartyName, date, time }) => {
  const subject = `Cancelled Appointment Notification: ${date}`;
  const text = `Hi ${recipientName},\n\nWe would like to inform you that your scheduled appointment on ${date} at ${time} with ${otherPartyName} has been cancelled.\n\nFor questions, please contact our support team.`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #dc2626; margin-top: 0;">Consultation Cancelled</h2>
      <p>Hi <strong>${recipientName}</strong>,</p>
      <p>This email is to confirm that the scheduled consultation on <strong>${date}</strong> at <strong>${time}</strong> with <strong>${otherPartyName}</strong> has been cancelled.</p>
      <p style="color: #475569; font-size: 14px;">If you need to reschedule, please visit the Medigo portal to view available slots and choose a new session.</p>
      <p style="margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}" style="background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          Go to Medigo Homepage
        </a>
      </p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
    </div>
  `;
  return sendEmail({ to: toEmail, subject, html, text });
};

const sendPrescriptionAddedEmail = async ({ patientEmail, patientName, doctorName, date, rxId, appointmentId }) => {
  const subject = `New Prescription Added by Dr. ${doctorName}`;
  const text = `Hi ${patientName},\n\nDr. ${doctorName} has added a prescription for your consultation on ${date} (Rx ID: ${rxId}).\n\nYou can view and download it at: ${process.env.FRONTEND_URL || "http://localhost:3000"}/prescription/${appointmentId}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">Prescription Added</h2>
      <p>Hi <strong>${patientName}</strong>,</p>
      <p><strong>Dr. ${doctorName}</strong> has uploaded a prescription for your recent medical consultation on <strong>${date}</strong>.</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0; border-left: 4px solid #059669;">
        <strong>Rx Reference ID:</strong> ${rxId}<br/>
        <strong>Doctor:</strong> Dr. ${doctorName}<br/>
        <strong>Consultation Date:</strong> ${date}
      </div>
      <p>Click the button below to view, print, or download your digital prescription copy securely.</p>
      <p style="margin: 28px 0;">
        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/prescription/${appointmentId}" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
          View Digital Rx
        </a>
      </p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
      <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
    </div>
  `;
  return sendEmail({ to: patientEmail, subject, html, text });
};

const sendPasswordResetOtpEmail = async ({ to, name, otp }) => {
  const subject = `Your Medigo Password Reset Code`;
  const text = `Hi ${name || "there"},\n\nWe received a request to reset the password for your Medigo account.\n\nYour 6-digit verification code is: ${otp}\nThis code is valid for 15 minutes.\n\nIf you did not request this password reset, you can safely ignore this email.\n\n— Medigo`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #059669; margin-top: 0;">Password Reset Request</h2>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Hi <strong>${name || "there"}</strong>,</p>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">We received a request to reset your password. Use the 6-digit code below to set a new password. This code will expire in <strong>15 minutes</strong>:</p>
      <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin: 24px 0; font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; text-align: center; color: #059669; border: 1px dashed #059669;">
        ${otp}
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 0;">If you did not make this request, your account is still secure and you may safely ignore this message.</p>
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
  sendPasswordResetOtpEmail,
  sendAppointmentCreatedEmail,
  sendAppointmentCancelledEmail,
  sendPrescriptionAddedEmail,
  isSmtpConfigured,
};

