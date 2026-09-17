const Appointment = require("../models/Appointment");
const User = require("../models/User");
const TestReportFile = require("../models/TestReportFile");
const { sendAppointmentCreatedEmail, sendAppointmentCancelledEmail, sendPrescriptionAddedEmail } = require("../utils/emailService");
const { createAndSendNotification } = require("../utils/notificationService");
const { generateTokensForSchedule, timeToMinutes } = require("../utils/tokenGenerator");

// Create a new appointment
const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, type, reason } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !date || !time) {
      return res.status(400).json({ message: "Doctor ID, date, and time slot are required" });
    }

    // Validate that the date and time slot are not in the past
    const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let [_, hoursStr, minutesStr, ampm] = match;
      let hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      if (ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }

      const [year, month, day] = date.split("-").map(num => parseInt(num, 10));
      // Create booking date object in server's local time
      const bookingDateTime = new Date(year, month - 1, day, hours, minutes, 0);
      
      // If bookingDateTime is in the past, block it
      if (bookingDateTime < new Date()) {
        return res.status(400).json({ message: "Cannot book an appointment slot in the past" });
      }
    } else {
      // Fallback simple date check if time format matches differently
      const thresholdDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const thresholdStr = thresholdDate.toISOString().split("T")[0];
      if (date < thresholdStr) {
        return res.status(400).json({ message: "Cannot book appointments in past dates" });
      }
    }

    // Resolve doctor details
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Resolve patient details
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const { tokenNumber, tokenTime } = req.body;

    // Check if slot or token is already booked for this doctor on this date
    const slotConflictQuery = {
      doctorId,
      date,
      status: { $ne: "Cancelled" },
      $or: [
        { time: time },
        ...(tokenNumber ? [{ tokenNumber: parseInt(tokenNumber, 10) }] : []),
      ],
    };

    const alreadyBooked = await Appointment.findOne(slotConflictQuery);
    if (alreadyBooked) {
      return res.status(400).json({
        message: "Token Full: This slot is already booked by another patient. Please choose another token.",
        isTokenFull: true,
      });
    }

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      clinicId: doctor.clinicId || null,
      doctorName: doctor.fullName,
      specialty: doctor.category || "General Medicine",
      patientName: patient.fullName,
      date,
      time,
      tokenNumber: tokenNumber ? parseInt(tokenNumber, 10) : null,
      tokenTime: tokenTime || time,
      type: type || "Video Consultation",
      reason: reason || "General Checkup",
    });

    // Send email notifications asynchronously in the background so HTTP response is instant
    sendAppointmentCreatedEmail({
      patientEmail: patient.email,
      patientName: patient.fullName,
      doctorEmail: doctor.email,
      doctorName: doctor.fullName,
      date: appointment.date,
      time: appointment.time,
      type: appointment.type
    }).catch(emailErr => {
      console.error("Failed to send appointment confirmation emails:", emailErr.message);
    });

    // Trigger live in-app notifications asynchronously
    Promise.all([
      createAndSendNotification({
        userId: patientId,
        title: "Appointment Booked",
        message: `Your appointment with Dr. ${doctor.fullName} on ${date} at ${time} is confirmed.`,
        type: "appointment_confirmed",
        link: "/profile",
      }),
      createAndSendNotification({
        userId: doctorId,
        title: "New Appointment Scheduled",
        message: `${patient.fullName} has scheduled a consultation with you on ${date} at ${time}.`,
        type: "appointment_created",
        link: "/doctor",
      })
    ]).catch(notifErr => {
      console.error("Failed to send appointment notifications:", notifErr.message);
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error("Create Appointment Error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Token Full: This slot was just booked by another patient. Please choose another token.",
        isTokenFull: true,
      });
    }
    return res.status(500).json({ message: "Server error creating appointment" });
  }
};

// Fetch appointments booked by a patient
const getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Get Patient Appointments Error:", error);
    return res.status(500).json({ message: "Server error fetching appointments" });
  }
};

// Fetch appointments scheduled with a doctor
const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Get Doctor Appointments Error:", error);
    return res.status(500).json({ message: "Server error fetching doctor schedule" });
  }
};

// Update appointment status
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Confirmed", "Cancelled", "Completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Patient, assigned doctor, or owning clinic may update status
    const isAuthorized =
      appointment.patientId.toString() === req.user._id.toString() ||
      appointment.doctorId.toString() === req.user._id.toString() ||
      (req.user.role === "clinic" &&
        appointment.clinicId &&
        appointment.clinicId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to update this appointment" });
    }

    appointment.status = status;
    await appointment.save();

    if (status === "Cancelled") {
      try {
        const patient = await User.findById(appointment.patientId);
        const doctor = await User.findById(appointment.doctorId);

        if (patient && doctor) {
          // Send cancellation emails
          await sendAppointmentCancelledEmail({
            toEmail: patient.email,
            recipientName: patient.fullName,
            otherPartyName: `Dr. ${doctor.fullName}`,
            date: appointment.date,
            time: appointment.time,
          });

          await sendAppointmentCancelledEmail({
            toEmail: doctor.email,
            recipientName: `Dr. ${doctor.fullName}`,
            otherPartyName: patient.fullName,
            date: appointment.date,
            time: appointment.time,
          });

          // Live notifications (notify the other party depending on who cancelled)
          const actorId = req.user._id.toString();
          
          if (actorId === patient._id.toString()) {
            await createAndSendNotification({
              userId: doctor._id,
              title: "Appointment Cancelled",
              message: `Patient ${patient.fullName} has cancelled the appointment scheduled on ${appointment.date} at ${appointment.time}.`,
              type: "appointment_cancelled",
              link: "/doctor",
            });
          } else {
            await createAndSendNotification({
              userId: patient._id,
              title: "Appointment Cancelled",
              message: `Dr. ${doctor.fullName} has cancelled your appointment scheduled on ${appointment.date} at ${appointment.time}.`,
              type: "appointment_cancelled",
              link: "/profile",
            });
          }
        }
      } catch (err) {
        console.error("Failed to send cancellation emails/notifications:", err);
      }
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Update Appointment Status Error:", error);
    return res.status(500).json({ message: "Server error updating appointment" });
  }
};

const addPrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      doctorName,
      doctorDegree,
      clinicName,
      clinicAddress,
      clinicPhone,
      patientAge,
      patientSex,
      medicines,
      tests,
      advice,
    } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only the assigned doctor can add/edit the prescription
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the assigned doctor can add a prescription" });
    }

    // Generate rxId if not present (simple prefix + random number)
    const rxId = appointment.prescription?.rxId || `MDG-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Format date as DD/MM/YYYY to match template
    const dateStr = appointment.prescription?.date || new Date().toLocaleDateString("en-GB");

    appointment.prescription = {
      doctorName: doctorName || appointment.doctorName,
      doctorDegree: doctorDegree || "",
      clinicName: clinicName || "",
      clinicAddress: clinicAddress || "",
      clinicPhone: clinicPhone || "",
      patientAge: patientAge || "",
      patientSex: patientSex || "",
      rxId,
      date: dateStr,
      medicines: medicines || [],
      tests: tests || [],
      advice: advice || "",
    };

    // Update status to Completed upon prescribing
    appointment.status = "Completed";
    await appointment.save();

    try {
      const patient = await User.findById(appointment.patientId);
      const doctor = await User.findById(appointment.doctorId);

      if (patient && doctor) {
        // Send email to patient
        await sendPrescriptionAddedEmail({
          patientEmail: patient.email,
          patientName: patient.fullName,
          doctorName: doctor.fullName,
          date: appointment.date,
          rxId,
          appointmentId: appointment._id,
        });

        // Send live notification to patient
        await createAndSendNotification({
          userId: patient._id,
          title: "New Prescription Added",
          message: `Dr. ${doctor.fullName} has uploaded a digital prescription for your consultation on ${appointment.date}.`,
          type: "prescription_added",
          link: `/prescription/${appointment._id}`,
        });
      }
    } catch (err) {
      console.error("Failed to dispatch prescription updates:", err);
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Add Prescription Error:", error);
    return res.status(500).json({ message: "Server error saving prescription" });
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    // Authorization check: patient, doctor, or clinic
    let isAuthorized =
      appointment.patientId.toString() === req.user._id.toString() ||
      appointment.doctorId.toString() === req.user._id.toString() ||
      (req.user.role === "clinic" &&
        appointment.clinicId &&
        appointment.clinicId.toString() === req.user._id.toString());

    if (!isAuthorized && req.user.role === "clinic") {
      const doctor = await User.findOne({ _id: appointment.doctorId, clinicId: req.user._id });
      if (doctor) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to view this appointment" });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Get Appointment By Id Error:", error);
    return res.status(500).json({ message: "Server error fetching appointment details" });
  }
};

const getPatientHistoryForDoctor = async (req, res) => {
  try {
    if (req.user.role !== "doctor" && req.user.role !== "clinic") {
      return res.status(403).json({ message: "Not authorized to view patient history" });
    }

    const { patientId } = req.params;
    const history = await Appointment.find({ patientId }).sort({ date: -1, time: -1 });
    return res.status(200).json(history);
  } catch (error) {
    console.error("Get Patient History Error:", error);
    return res.status(500).json({ message: "Server error fetching patient history" });
  }
};

const markAppointmentAttended = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only the patient associated with this appointment can mark attendance
    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this appointment" });
    }

    appointment.patientAttended = true;
    await appointment.save();

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Mark Appointment Attended Error:", error);
    return res.status(500).json({ message: "Server error marking appointment as attended" });
  }
};

// Upload a test report for a prescribed test
const uploadTestReport = async (req, res) => {
  try {
    const { id, testIndex } = req.params;
    const { fileName, fileType, fileSize, fileData, patientNotes } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({ message: "File data and file name are required" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Authorization: patient of this appointment or clinic
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isClinic = req.user.role === "clinic" && appointment.clinicId && appointment.clinicId.toString() === req.user._id.toString();
    if (!isPatient && !isClinic) {
      return res.status(403).json({ message: "Not authorized to upload test reports for this appointment" });
    }

    const idx = parseInt(testIndex, 10);
    if (isNaN(idx) || !appointment.prescription?.tests || !appointment.prescription.tests[idx]) {
      return res.status(400).json({ message: "Invalid prescribed test index" });
    }

    // Upsert document in TestReportFile
    await TestReportFile.findOneAndUpdate(
      { appointmentId: appointment._id, testIndex: idx },
      {
        appointmentId: appointment._id,
        testIndex: idx,
        fileName,
        fileType: fileType || "application/pdf",
        fileSize: fileSize || 0,
        fileData,
        uploadedBy: req.user._id,
        patientNotes: patientNotes || "",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Update test record in appointment
    const testItem = appointment.prescription.tests[idx];
    testItem.reportStatus = "uploaded";
    testItem.report = {
      fileName,
      fileType: fileType || "application/pdf",
      fileSize: fileSize || 0,
      uploadedAt: new Date(),
      patientNotes: patientNotes || "",
      fileUrl: `/api/appointments/${appointment._id}/tests/${idx}/file`,
    };

    await appointment.save();

    // Send live notification to assigned doctor
    try {
      const uploaderName = req.user.fullName || appointment.patientName;
      await createAndSendNotification({
        userId: appointment.doctorId,
        title: "New Test Report Uploaded",
        message: `${uploaderName} uploaded a test report for "${testItem.name}" (Appointment: ${appointment.date}).`,
        type: "test_report_uploaded",
        link: "/doctor",
      });
    } catch (notifyErr) {
      console.error("Failed to notify doctor about test report upload:", notifyErr);
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Upload Test Report Error:", error);
    return res.status(500).json({ message: "Server error uploading test report" });
  }
};

// Get / stream the uploaded test report document
const getTestReportFile = async (req, res) => {
  try {
    const { id, testIndex } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Authorization: patient, doctor, or clinic
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isClinic = req.user.role === "clinic" && appointment.clinicId && appointment.clinicId.toString() === req.user._id.toString();
    if (!isPatient && !isDoctor && !isClinic) {
      return res.status(403).json({ message: "Not authorized to view this report file" });
    }

    const idx = parseInt(testIndex, 10);
    const reportFile = await TestReportFile.findOne({ appointmentId: appointment._id, testIndex: idx });
    if (!reportFile) {
      return res.status(404).json({ message: "Report file not found" });
    }

    let base64String = reportFile.fileData;
    if (base64String.includes(",")) {
      base64String = base64String.split(",")[1];
    }
    const fileBuffer = Buffer.from(base64String, "base64");

    res.setHeader("Content-Type", reportFile.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(reportFile.fileName)}"`);
    res.setHeader("Content-Length", fileBuffer.length);
    return res.send(fileBuffer);
  } catch (error) {
    console.error("Get Test Report File Error:", error);
    return res.status(500).json({ message: "Server error retrieving report file" });
  }
};

// Doctor reviews and comments on an uploaded test report
const reviewTestReport = async (req, res) => {
  try {
    const { id, testIndex } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: "Doctor review comment is required" });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only assigned doctor (or clinic) can review
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isClinic = req.user.role === "clinic" && appointment.clinicId && appointment.clinicId.toString() === req.user._id.toString();
    if (!isDoctor && !isClinic) {
      return res.status(403).json({ message: "Only the assigned doctor can review this test report" });
    }

    const idx = parseInt(testIndex, 10);
    if (isNaN(idx) || !appointment.prescription?.tests || !appointment.prescription.tests[idx]) {
      return res.status(400).json({ message: "Invalid prescribed test index" });
    }

    const testItem = appointment.prescription.tests[idx];
    testItem.reportStatus = "reviewed";
    testItem.doctorReview = {
      comment: comment.trim(),
      reviewedAt: new Date(),
      doctorId: req.user._id,
      doctorName: req.user.fullName || appointment.doctorName,
    };

    await appointment.save();

    // Send live notification to patient
    try {
      const reviewerName = req.user.fullName || appointment.doctorName;
      const shortComment = comment.trim().length > 60 ? comment.trim().slice(0, 60) + "..." : comment.trim();
      await createAndSendNotification({
        userId: appointment.patientId,
        title: "Doctor Reviewed Your Test Report",
        message: `Dr. ${reviewerName} reviewed your report for "${testItem.name}": "${shortComment}"`,
        type: "test_report_reviewed",
        link: `/prescription/${appointment._id}`,
      });
    } catch (notifyErr) {
      console.error("Failed to notify patient about test report review:", notifyErr);
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Review Test Report Error:", error);
    return res.status(500).json({ message: "Server error submitting report review" });
  }
};

// Fetch tokens and real-time booking status for a doctor on a specific date
const getDoctorTokens = async (req, res) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId || !date) {
      return res.status(400).json({ message: "Doctor ID and date (YYYY-MM-DD) are required" });
    }

    const doctor = await User.findById(doctorId).select(
      "fullName category weeklySchedule availableDays availableSlots role"
    );
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ message: "Doctor not found" });
    }

    // Determine the day of the week from the date string YYYY-MM-DD
    const [year, month, day] = date.split("-").map((num) => parseInt(num, 10));
    const targetDate = new Date(year, month - 1, day);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayOfWeek = dayNames[targetDate.getDay()];

    // Check if doctor has weeklySchedule configured
    let daySchedule = null;
    if (doctor.weeklySchedule && doctor.weeklySchedule.length > 0) {
      daySchedule = doctor.weeklySchedule.find(
        (s) => s.day && s.day.toLowerCase() === dayOfWeek.toLowerCase()
      );
    }

    // Check if doctor is working on this day
    const isWorking = daySchedule
      ? daySchedule.isActive !== false
      : (doctor.availableDays || []).some(
          (d) => d.toLowerCase() === dayOfWeek.toLowerCase()
        );

    if (!isWorking) {
      return res.status(200).json({
        isWorkingDay: false,
        day: dayOfWeek,
        doctorName: doctor.fullName,
        message: `Dr. ${doctor.fullName} is not available for consultations on ${dayOfWeek}s.`,
        tokens: [],
      });
    }

    // Determine tokens for this day
    let tokens = [];
    if (daySchedule && daySchedule.tokens && daySchedule.tokens.length > 0) {
      tokens = daySchedule.tokens;
    } else if (daySchedule && daySchedule.startTime && daySchedule.endTime) {
      tokens = generateTokensForSchedule({
        startTime: daySchedule.startTime,
        endTime: daySchedule.endTime,
        duration: daySchedule.consultationDuration || 15,
        breaks: daySchedule.breaks || [],
      });
    } else if (doctor.availableSlots && doctor.availableSlots.length > 0) {
      // Fallback to legacy availableSlots
      tokens = doctor.availableSlots.map((slot, index) => ({
        tokenNumber: index + 1,
        startTime: slot,
        endTime: slot,
        displayTime: slot,
      }));
    } else {
      // Default tokens 10:00 AM - 03:00 PM with 15 mins
      tokens = generateTokensForSchedule({
        startTime: "10:00 AM",
        endTime: "03:00 PM",
        duration: 15,
        breaks: [{ startTime: "12:30 PM", endTime: "01:00 PM" }],
      });
    }

    // Query existing non-cancelled appointments for this doctor on this date
    const bookedAppointments = await Appointment.find({
      doctorId,
      date,
      status: { $ne: "Cancelled" },
    }).select("time tokenNumber status");

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const isToday = todayStr === date;

    const tokensWithStatus = tokens.map((tok) => {
      // Check if booked
      const isBooked = bookedAppointments.some(
        (app) =>
          (tok.tokenNumber && app.tokenNumber === tok.tokenNumber) ||
          app.time === tok.startTime ||
          app.time === tok.displayTime
      );

      // Check if in the past
      let isPast = false;
      if (date < todayStr) {
        isPast = true;
      } else if (isToday) {
        const slotMin = timeToMinutes(tok.startTime);
        const currentMin = now.getHours() * 60 + now.getMinutes();
        if (slotMin <= currentMin) {
          isPast = true;
        }
      }

      return {
        tokenNumber: tok.tokenNumber,
        startTime: tok.startTime,
        endTime: tok.endTime,
        displayTime: tok.displayTime,
        isBooked,
        isFull: isBooked,
        isPast,
      };
    });

    const totalCount = tokensWithStatus.length;
    const bookedCount = tokensWithStatus.filter((t) => t.isBooked).length;
    const availableCount = tokensWithStatus.filter((t) => !t.isBooked && !t.isPast).length;

    return res.status(200).json({
      isWorkingDay: true,
      day: dayOfWeek,
      doctorName: doctor.fullName,
      schedule: daySchedule
        ? {
            startTime: daySchedule.startTime,
            endTime: daySchedule.endTime,
            consultationDuration: daySchedule.consultationDuration,
            breaks: daySchedule.breaks,
          }
        : null,
      totalTokens: totalCount,
      availableTokens: availableCount,
      bookedTokens: bookedCount,
      tokens: tokensWithStatus,
    });
  } catch (error) {
    console.error("Get Doctor Tokens Error:", error);
    return res.status(500).json({ message: "Server error retrieving doctor tokens" });
  }
};

module.exports = {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  addPrescription,
  getAppointmentById,
  getPatientHistoryForDoctor,
  markAppointmentAttended,
  uploadTestReport,
  getTestReportFile,
  reviewTestReport,
  getDoctorTokens,
};
