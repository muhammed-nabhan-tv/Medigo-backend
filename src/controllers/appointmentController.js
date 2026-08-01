const Appointment = require("../models/Appointment");
const User = require("../models/User");

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

    const appointment = await Appointment.create({
      patientId,
      doctorId,
      clinicId: doctor.clinicId || null,
      doctorName: doctor.fullName,
      specialty: doctor.category || "General Medicine",
      patientName: patient.fullName,
      date,
      time,
      type: type || "Video Consultation",
      reason: reason || "General Checkup",
      status: "Confirmed",
    });

    return res.status(201).json(appointment);
  } catch (error) {
    console.error("Create Appointment Error:", error);
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
      advice: advice || "",
    };

    // Update status to Completed upon prescribing
    appointment.status = "Completed";
    await appointment.save();

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
    const isAuthorized =
      appointment.patientId.toString() === req.user._id.toString() ||
      appointment.doctorId.toString() === req.user._id.toString() ||
      (req.user.role === "clinic" &&
        appointment.clinicId &&
        appointment.clinicId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: "Not authorized to view this appointment" });
    }

    return res.status(200).json(appointment);
  } catch (error) {
    console.error("Get Appointment By Id Error:", error);
    return res.status(500).json({ message: "Server error fetching appointment details" });
  }
};

module.exports = {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  updateAppointmentStatus,
  addPrescription,
  getAppointmentById,
};
