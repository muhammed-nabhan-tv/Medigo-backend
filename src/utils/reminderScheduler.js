const Appointment = require("../models/Appointment");
const User = require("../models/User");
const { sendEmail } = require("./emailService");
const { createAndSendNotification } = require("./notificationService");
const cron = require("node-cron");
/**
 * Parses appointment date string ("YYYY-MM-DD") and time string ("HH:MM AM/PM")
 * into a single unified JavaScript Date object.
 */
const parseAppointmentDateTime = (dateStr, timeStr) => {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    
    let [_, hoursStr, minutesStr, ampm] = match;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (ampm.toUpperCase() === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === "AM" && hours === 12) {
      hours = 0;
    }
    
    // Returns date representing the appointment slot in server time
    return new Date(year, month - 1, day, hours, minutes, 0);
  } catch (err) {
    console.error("Error parsing appointment date/time:", err);
    return null;
  }
};

/**
 * Query database for Confirmed appointments that start within the next 24 hours
 * and send both email and live notification reminders if not already sent.
 */
const checkUpcomingAppointments = async () => {
  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find Confirmed appointments where reminderSent is false or not set
    const appointments = await Appointment.find({
      status: "Confirmed",
      reminderSent: { $ne: true },
    });

    if (appointments.length === 0) return;

    console.log(`[Reminder Scheduler] Checking ${appointments.length} confirmed appointments for upcoming reminders...`);

    for (const app of appointments) {
      const appDateTime = parseAppointmentDateTime(app.date, app.time);
      if (!appDateTime) continue;

      // Check if the appointment falls in the next 24 hours window (and is in the future)
      if (appDateTime > now && appDateTime <= twentyFourHoursLater) {
        console.log(`[Reminder Scheduler] Triggering reminder for Appointment ID: ${app._id} (with Dr. ${app.doctorName} for patient ${app.patientName})`);

        const patient = await User.findById(app.patientId);
        const doctor = await User.findById(app.doctorId);

        // 1. Notify Patient
        if (patient) {
          const patientSubject = `Reminder: Upcoming consultation with Dr. ${app.doctorName}`;
          const patientText = `Hi ${patient.fullName},\n\nThis is a reminder that you have an upcoming consultation with Dr. ${app.doctorName} tomorrow at ${app.time}.\n\nDate: ${app.date}\nTime: ${app.time}\nType: ${app.type}\n\nPlease log in to the portal to join your video room.`;
          const patientHtml = `
            <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #059669; margin-top: 0;">Consultation Reminder</h2>
              <p>Hi <strong>${patient.fullName}</strong>,</p>
              <p>This is a reminder of your upcoming consultation session with <strong>Dr. ${app.doctorName}</strong>:</p>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0; border-left: 4px solid #059669;">
                <strong>Practitioner:</strong> Dr. ${app.doctorName}<br/>
                <strong>Date:</strong> ${app.date}<br/>
                <strong>Time:</strong> ${app.time}<br/>
                <strong>Session Type:</strong> ${app.type}
              </div>
              <p>Please log in to your patient dashboard shortly before the scheduled time to connect.</p>
              <p style="margin: 28px 0;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/profile" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Go to Patient Dashboard
                </a>
              </p>
              <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
            </div>
          `;

          await sendEmail({
            to: patient.email,
            subject: patientSubject,
            text: patientText,
            html: patientHtml,
          });

          await createAndSendNotification({
            userId: app.patientId,
            title: "Upcoming Consultation Reminder",
            message: `Reminder: You have a consultation with Dr. ${app.doctorName} scheduled on ${app.date} at ${app.time}.`,
            type: "reminder",
            link: "/profile",
          });
        }

        // 2. Notify Doctor
        if (doctor) {
          const doctorSubject = `Reminder: Upcoming consultation with ${app.patientName}`;
          const doctorText = `Hi Dr. ${doctor.fullName},\n\nThis is a reminder that you have an upcoming consultation with patient ${app.patientName} tomorrow at ${app.time}.\n\nDate: ${app.date}\nTime: ${app.time}\nType: ${app.type}\n\nPlease check your schedule dashboard.`;
          const doctorHtml = `
            <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #059669; margin-top: 0;">Consultation Reminder</h2>
              <p>Hi <strong>Dr. ${doctor.fullName}</strong>,</p>
              <p>This is a reminder of your upcoming consultation with patient <strong>${app.patientName}</strong>:</p>
              <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 18px 0; border-left: 4px solid #059669;">
                <strong>Patient Name:</strong> ${app.patientName}<br/>
                <strong>Date:</strong> ${app.date}<br/>
                <strong>Time:</strong> ${app.time}<br/>
                <strong>Session Type:</strong> ${app.type}
              </div>
              <p>Please check your schedule dashboard to review medical records and prepare prescriptions.</p>
              <p style="margin: 28px 0;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/doctor" style="background:#059669;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;">
                  Go to Specialist Dashboard
                </a>
              </p>
              <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0;"/>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
            </div>
          `;

          await sendEmail({
            to: doctor.email,
            subject: doctorSubject,
            text: doctorText,
            html: doctorHtml,
          });

          await createAndSendNotification({
            userId: app.doctorId,
            title: "Upcoming Consultation Reminder",
            message: `Reminder: You have a consultation with ${app.patientName} scheduled on ${app.date} at ${app.time}.`,
            type: "reminder",
            link: "/doctor",
          });
        }

        // Update DB so reminder isn't sent again
        app.reminderSent = true;
        await app.save();
      }
    }
  } catch (error) {
    console.error("[Reminder Scheduler] Error executing check:", error);
  }
};

/**
 * Query database for Confirmed or Pending appointments that are in the past
 * and close them (mark them as Cancelled) because the patient did not attend.
 */
const closeExpiredAppointments = async () => {
  try {
    const now = new Date();
    
    // Find all appointments that are Confirmed or Pending
    const appointments = await Appointment.find({
      status: { $in: ["Confirmed", "Pending"] },
    });

    if (appointments.length === 0) return;

    let closedCount = 0;
    for (const app of appointments) {
      const appDateTime = parseAppointmentDateTime(app.date, app.time);
      if (!appDateTime) continue;

      // Check if the appointment start time is in the past (with a 30-minute grace period buffer)
      const expiryTime = new Date(appDateTime.getTime() + 30 * 60 * 1000); 
      if (now > expiryTime) {
        console.log(`[Reminder Scheduler] Closing expired appointment ID: ${app._id} (with Dr. ${app.doctorName} for patient ${app.patientName})`);
        
        app.status = "Cancelled";
        await app.save();
        closedCount++;

        // Send a notification to the patient and doctor that the appointment was auto-cancelled
        try {
          await createAndSendNotification({
            userId: app.patientId,
            title: "Appointment Closed",
            message: `Your appointment with Dr. ${app.doctorName} on ${app.date} at ${app.time} has been automatically closed/cancelled as the time has passed.`,
            type: "appointment_cancelled",
            link: "/profile",
          });

          await createAndSendNotification({
            userId: app.doctorId,
            title: "Appointment Closed",
            message: `The appointment with ${app.patientName} scheduled for ${app.date} at ${app.time} has been automatically closed/cancelled as the time has passed.`,
            type: "appointment_cancelled",
            link: "/doctor",
          });
        } catch (notifErr) {
          console.error("Failed to send auto-close notifications:", notifErr);
        }
      }
    }

    if (closedCount > 0) {
      console.log(`[Reminder Scheduler] Automatically closed ${closedCount} expired appointments.`);
    }
  } catch (error) {
    console.error("[Reminder Scheduler] Error executing auto-close check:", error);
  }
};

/**
 * Query database for Confirmed appointments starting in the next 1 hour
 * and send a 1-hour email reminder to the patient.
 */
const checkOneHourReminders = async () => {
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    // Find Confirmed appointments where oneHourReminderSent is false or not set
    const appointments = await Appointment.find({
      status: "Confirmed",
      oneHourReminderSent: { $ne: true },
    });

    if (appointments.length === 0) return;

    for (const app of appointments) {
      const appDateTime = parseAppointmentDateTime(app.date, app.time);
      if (!appDateTime) continue;

      // Check if the appointment starts within the next 1 hour (and is in the future)
      if (appDateTime > now && appDateTime <= oneHourLater) {
        console.log(`[Reminder Scheduler] Triggering 1-hour reminder for Appointment ID: ${app._id}`);

        const patient = await User.findById(app.patientId);
        if (patient) {
          const subject = `Urgent Reminder: Your consultation with Dr. ${app.doctorName} is starting in less than 1 hour!`;
          const text = `Hi ${patient.fullName},\n\nYour appointment with Dr. ${app.doctorName} is starting in less than 1 hour at ${app.time} today (${app.date}).\n\nYour time has come! Please come fast and join the dashboard to connect.\n\nDashboard: http://localhost:3000/profile`;
          
          const html = `
            <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; color: #0f172a; border: 1px solid #f59e0b; padding: 24px; border-radius: 12px; background: #fffbeb;">
              <h2 style="color: #d97706; margin-top: 0;">⏰ Urgent Consultation Reminder</h2>
              <p>Hi <strong>${patient.fullName}</strong>,</p>
              <p>This is a quick reminder that your appointment with <strong>Dr. ${app.doctorName}</strong> is starting in less than 1 hour!</p>
              <div style="background: #ffffff; padding: 16px; border-radius: 8px; margin: 18px 0; border: 1px solid #fcd34d; border-left: 4px solid #d97706;">
                <strong>Practitioner:</strong> Dr. ${app.doctorName}<br/>
                <strong>Time:</strong> <span style="color: #d97706; font-weight: bold;">${app.time} (Today)</span><br/>
                <strong>Date:</strong> ${app.date}<br/>
                <strong>Session Type:</strong> ${app.type}
              </div>
              <p style="font-weight: bold; color: #b45309;">Your time has come! Please come fast and log in to the portal to join your video room shortly before the scheduled time.</p>
              <p style="margin: 28px 0;">
                <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/profile" style="background:#d97706;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">
                  Join Patient Dashboard
                </a>
              </p>
              <hr style="border:0;border-top:1px solid #fcd34d;margin:20px 0;"/>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:0;">— The Medigo team</p>
            </div>
          `;

          await sendEmail({
            to: patient.email,
            subject: subject,
            text: text,
            html: html,
          });

          await createAndSendNotification({
            userId: app.patientId,
            title: "Urgent Appointment Reminder (1 Hour)",
            message: `Reminder: Your consultation with Dr. ${app.doctorName} starts at ${app.time} (less than 1 hour). Please join the room!`,
            type: "reminder",
            link: "/profile",
          });
        }

        // Update DB so 1-hour reminder isn't sent again
        app.oneHourReminderSent = true;
        await app.save();
      }
    }
  } catch (error) {
    console.error("[Reminder Scheduler] Error executing 1-hour reminder check:", error);
  }
};

/**
 * Start the cron scheduler for checking upcoming appointments
 */
const startReminderScheduler = () => {
  // Check immediately upon server startup
  checkUpcomingAppointments();
  closeExpiredAppointments();
  checkOneHourReminders();
  
  // Schedule a cron job to run every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    console.log("[Reminder Scheduler] Running scheduled checks for upcoming, expired, and 1-hour reminder consultations...");
    checkUpcomingAppointments();
    closeExpiredAppointments();
    checkOneHourReminders();
  });
  console.log("[Reminder Scheduler] Background scheduler initialized successfully with cron expressions (Running every 5 minutes).");
};

module.exports = {
  startReminderScheduler,
};
