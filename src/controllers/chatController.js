const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Appointment = require("../models/Appointment");
const { sendAppointmentCreatedEmail } = require("../utils/emailService");
const { createAndSendNotification } = require("../utils/notificationService");

// Helper to format Date objects as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Compute upcoming dates matching doctor's available days
const getUpcomingAvailableDates = (availableDays = [], count = 5) => {
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dates = [];
  const today = new Date();

  for (let offset = 1; offset <= 21 && dates.length < count; offset++) {
    const checkDate = new Date();
    checkDate.setDate(today.getDate() + offset);
    const dayName = daysOfWeek[checkDate.getDay()];
    if (availableDays.includes(dayName)) {
      dates.push({
        date: formatDate(checkDate),
        dayName,
        label: `${dayName}, ${checkDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
      });
    }
  }

  return dates;
};

// Symptom triage and healthcare knowledge engine
const analyzeSymptomsAndFAQs = (msgLower, doctors) => {
  // Emergency checks
  if (
    msgLower.includes("emergency") ||
    msgLower.includes("suicide") ||
    msgLower.includes("can't breathe") ||
    msgLower.includes("stroke") ||
    msgLower.includes("heart attack") ||
    msgLower.includes("severe bleeding")
  ) {
    return {
      type: "emergency",
      message: `⚠️ **CRITICAL MEDICAL ADVISORY**:\nIf you or someone else is experiencing severe, life-threatening symptoms (such as sudden severe chest pressure, inability to breathe, facial drooping, or uncontrolled bleeding), **please call emergency services immediately (911, 112, or your local emergency line)** or go to the nearest emergency department.\n\nMedigo telemedicine is for non-emergent outpatient consultations only.`,
      disclaimer: "Always seek emergency department care for acute life-threatening situations.",
      suggestedActions: ["Call Emergency Services", "Find Nearest Hospital", "Speak to a Doctor"]
    };
  }

  // FAQ: Video Consultations
  if (msgLower.includes("video") || msgLower.includes("telehealth") || msgLower.includes("virtual consult") || msgLower.includes("online consult")) {
    return {
      type: "faq",
      message: `📹 **How Medigo Video Consultations Work**:\n1. Book a slot with your chosen specialist.\n2. When your appointment time arrives, click the **'Join Video Consultation'** button in your Dashboard or Profile.\n3. The call runs in your browser with 256-bit HIPAA-compliant encryption—no software downloads required!\n4. Following the call, the practitioner uploads your signed digital prescription directly to your account.`,
      suggestedActions: ["Book a Doctor", "View Specialists", "Check Symptoms"]
    };
  }

  // FAQ: Prescriptions
  if (msgLower.includes("prescription") || msgLower.includes("rx") || msgLower.includes("download")) {
    return {
      type: "faq",
      message: `📄 **Accessing Your Digital Prescriptions**:\nAfter your consultation is completed by your doctor, your verified digital prescription is available instantly in your **Profile Portal** under **'My Consultations'**.\nYou can view, print, or save it as a high-resolution PDF for any pharmacy or lab testing!`,
      suggestedActions: ["View My Profile", "Book a Doctor", "Check Symptoms"]
    };
  }

  // FAQ: Clinic Hours / Fees
  if (msgLower.includes("fee") || msgLower.includes("cost") || msgLower.includes("price") || msgLower.includes("hour") || msgLower.includes("timing")) {
    return {
      type: "faq",
      message: `🏥 **Medigo Consultations & Timings**:\n• **Timings**: Practitioners offer slots Monday through Sunday across morning (9:00 AM – 1:00 PM) and afternoon (2:00 PM – 5:00 PM) schedules.\n• **Specialist Fees**: Consultations range from $30 to $60 depending on the specialty and practitioner experience.\n• **Services**: Virtual Telehealth, In-Clinic Visits, Digital Prescriptions, and EMR Record Management.`,
      suggestedActions: ["View Doctors", "Book Appointment", "General Medicine"]
    };
  }

  // Helper to match category flexibly
  const matchCategory = (docCat, target) => {
      const c = (docCat || "").toLowerCase();
      const t = target.toLowerCase();
      return c === t || c.includes(t) || (t.includes("general") && (c.includes("general") || c.includes("medicine")));
    };

    // Filter doctors by specialty with flexible matching
    const getDocsForSpecialty = (spec) => {
      const matched = doctors.filter(d => matchCategory(d.category, spec));
      return matched.length > 0 ? matched : doctors;
    };

    if (
      msgLower.includes("chest pain") ||
      msgLower.includes("heart") ||
      msgLower.includes("palpitation") ||
      msgLower.includes("bp") ||
      msgLower.includes("blood pressure") ||
      msgLower.includes("hypertension") ||
      msgLower.includes("cholesterol") ||
      msgLower.includes("cardio")
    ) {
      return {
        type: "symptom",
        specialty: "Cardiology",
        message: `❤️ **Clinical Assessment - Cardiovascular Health**:\nChest discomfort, palpitations, or elevated blood pressure require professional evaluation by a **Cardiologist**. If you have mild or recurrent symptoms, our practitioners can review your vitals, recommend an ECG or Lipid Profile, and tailor your care plan.\n\n*⚠️ Note: If you have crushing chest pain radiating to your left arm, neck, or jaw accompanied by sweating, call 911/112 immediately.*`,
        doctors: getDocsForSpecialty("Cardiology"),
        suggestedSpecialty: "Cardiology",
        disclaimer: "Informational triage support only. Not a formal diagnosis."
      };
    }

    // Symptom: Dermatology / Skin
    if (
      msgLower.includes("skin") ||
      msgLower.includes("rash") ||
      msgLower.includes("acne") ||
      msgLower.includes("itch") ||
      msgLower.includes("eczema") ||
      msgLower.includes("allergy") ||
      msgLower.includes("hair loss") ||
      msgLower.includes("psoriasis") ||
      msgLower.includes("derma")
    ) {
      return {
        type: "symptom",
        specialty: "Dermatology",
        message: `🧴 **Clinical Assessment - Dermatology & Skin**:\nSkin eruptions, persistent itching, or acne breakouts are best assessed by a **Dermatologist**. In a virtual consultation, our specialists can visually evaluate lesions, recommend soothing topical regimens, or prescribe targeted antiallergic therapy.\n\n*Tip: Avoid harsh soaps and resist scratching the affected areas to prevent secondary bacterial infection.*`,
        doctors: getDocsForSpecialty("Dermatology"),
        suggestedSpecialty: "Dermatology",
        disclaimer: "Informational triage support only. Not a formal diagnosis."
      };
    }

    // Symptom: Pediatrics / Child
    if (
      msgLower.includes("child") ||
      msgLower.includes("baby") ||
      msgLower.includes("infant") ||
      msgLower.includes("toddler") ||
      msgLower.includes("kid") ||
      msgLower.includes("pediatric")
    ) {
      return {
        type: "symptom",
        specialty: "Pediatrics",
        message: `👶 **Clinical Assessment - Pediatric Care**:\nChildren require specialized medical care tailored to their age, weight, and developmental stage. Our **Pediatricians** provide consultations for childhood fevers, coughs, rashes, feeding concerns, and immunization advice.`,
        doctors: getDocsForSpecialty("Pediatrics"),
        suggestedSpecialty: "Pediatrics",
        disclaimer: "Informational triage support only. Not a formal diagnosis."
      };
    }

    // Symptom: Neurology / Headache
    if (
      msgLower.includes("headache") ||
      msgLower.includes("migraine") ||
      msgLower.includes("dizzy") ||
      msgLower.includes("dizziness") ||
      msgLower.includes("numbness") ||
      msgLower.includes("tingling") ||
      msgLower.includes("vertigo") ||
      msgLower.includes("neuro")
    ) {
      return {
        type: "symptom",
        specialty: "Neurology",
        message: `🧠 **Clinical Assessment - Neurological Health**:\nFrequent headaches, migraines with aura, or unexplained dizziness warrant consultation with a **Neurologist**. Maintaining a headache diary and staying well-hydrated in a quiet, darkened room can provide temporary relief.\n\n*⚠️ Warning: A sudden, explosive 'thunderclap' headache with neck stiffness requires emergency hospital evaluation.*`,
        doctors: getDocsForSpecialty("Neurology"),
        suggestedSpecialty: "Neurology",
        disclaimer: "Informational triage support only. Not a formal diagnosis."
      };
    }

    // Symptom: Fever, General Infection, Cold, Flu
    if (
      msgLower.includes("fever") ||
      msgLower.includes("cold") ||
      msgLower.includes("cough") ||
      msgLower.includes("throat") ||
      msgLower.includes("flu") ||
      msgLower.includes("body ache") ||
      msgLower.includes("weakness") ||
      msgLower.includes("stomach") ||
      msgLower.includes("vomiting") ||
      msgLower.includes("diarrhea") ||
      msgLower.includes("symptom")
    ) {
      return {
        type: "symptom",
        specialty: "General Medicine",
        message: `🩺 **Clinical Assessment - General Health & Acute Illness**:\nSymptoms such as fever, persistent cough, sore throat, or gastrointestinal discomfort are best evaluated by a **General Medicine Physician**. They can prescribe antipyretics, antibiotics if indicated, or advise diagnostic tests like a Complete Blood Count (CBC).\n\n*Tip: Rest adequately, drink warm fluids, and track your body temperature with a digital thermometer.*`,
        doctors: getDocsForSpecialty("General Medicine"),
        suggestedSpecialty: "General Medicine",
        disclaimer: "Informational triage support only. Not a formal diagnosis."
      };
    }

    return null;
  };

  // Smart rule-based chatbot logic
  const handleFallbackChat = async (message, history, bookingDetails, doctors, patient) => {
    const msgLower = message.toLowerCase();

    // Initialize booking state
    const state = bookingDetails || {
      doctorId: null,
      date: null,
      time: null,
      type: "Video Consultation",
      reason: "General Checkup"
    };

    const getSelectedDoc = () => {
      return state.doctorId ? doctors.find(d => d._id.toString() === state.doctorId) : null;
    };

    // Check for reset / restart
    if (msgLower.includes("reset") || msgLower.includes("restart") || msgLower.includes("start over")) {
    return {
      message: `Welcome back! I am Medigo's AI Health & Booking Assistant.\n\nHow can I help you today? You can describe symptoms, ask health questions, or choose a specialty below to book an appointment!`,
      bookingDetails: {
        doctorId: null,
        date: null,
        time: null,
        type: "Video Consultation",
        reason: "General Checkup"
      },
      bookingReady: false,
      options: ["Check Symptoms", "General Medicine", "Cardiologist", "Dermatologist", "Pediatrician", "Neurologist"]
    };
  }

  // Step 1: Doctor selection if not yet set
  if (!state.doctorId) {
    // Check for symptom analysis or FAQ match
    const symptomAnalysis = analyzeSymptomsAndFAQs(msgLower, doctors);
    if (symptomAnalysis) {
      if (symptomAnalysis.type === "emergency" || symptomAnalysis.type === "faq") {
        return {
          message: symptomAnalysis.message,
          bookingDetails: state,
          bookingReady: false,
          suggestedActions: symptomAnalysis.suggestedActions
        };
      }

      if (symptomAnalysis.type === "symptom") {
        state.reason = symptomAnalysis.specialty;
        const matchingDocs = symptomAnalysis.doctors && symptomAnalysis.doctors.length > 0
          ? symptomAnalysis.doctors
          : doctors;

        return {
          message: `${symptomAnalysis.message}\n\nHere are our active practitioners ready for consultation:`,
          bookingDetails: state,
          bookingReady: false,
          doctorCards: matchingDocs.map(d => ({
            id: d._id.toString(),
            name: d.fullName,
            category: d.category || "General Medicine",
            education: d.education || "Certified Specialist",
            experience: d.experience || 10,
            rating: d.rating || 4.9,
            availableDays: d.availableDays || ["Monday", "Wednesday", "Friday"],
            availableSlots: d.availableSlots || ["09:00 AM", "10:00 AM", "02:00 PM"]
          })),
          suggestedActions: matchingDocs.map(d => `Select Dr. ${d.fullName}`)
        };
      }
    }

    // Check if user mentioned a doctor's name
    const matchedDoc = doctors.find(doc => {
      const nameParts = doc.fullName.toLowerCase().replace("dr.", "").replace("md", "").replace("phd", "").replace(",", "").trim().split(" ");
      return nameParts.some(part => part.length > 2 && msgLower.includes(part));
    });

    if (matchedDoc) {
      state.doctorId = matchedDoc._id.toString();
      state.reason = matchedDoc.category || "General Checkup";
      const upcomingDates = getUpcomingAvailableDates(matchedDoc.availableDays);
      return {
        message: `Great choice! I have selected **Dr. ${matchedDoc.fullName}** (${matchedDoc.category}).\n\nAvailable days: **${matchedDoc.availableDays.join(", ")}**.\n\nPlease select an upcoming date:`,
        bookingDetails: state,
        bookingReady: false,
        availableDates: upcomingDates,
        options: upcomingDates.map(d => d.date)
      };
    }

    // Check if user mentioned a specialty
    const specialties = ["General Medicine", "Pediatrics", "Cardiology", "Dermatology", "Neurology"];
    const matchedSpecialty = specialties.find(spec =>
      msgLower.includes(spec.toLowerCase()) ||
      (spec === "General Medicine" && (msgLower.includes("general") || msgLower.includes("physician")))
    );

    if (matchedSpecialty) {
      const matchingDocs = doctors.filter(d => d.category === matchedSpecialty);
      if (matchingDocs.length === 1) {
        state.doctorId = matchingDocs[0]._id.toString();
        state.reason = matchedSpecialty;
        const upcomingDates = getUpcomingAvailableDates(matchingDocs[0].availableDays);
        return {
          message: `For **${matchedSpecialty}**, I have selected **Dr. ${matchingDocs[0].fullName}**.\n\nAvailable days: **${matchingDocs[0].availableDays.join(", ")}**.\n\nWhich upcoming date works for you?`,
          bookingDetails: state,
          bookingReady: false,
          availableDates: upcomingDates,
          options: upcomingDates.map(d => d.date)
        };
      } else if (matchingDocs.length > 1) {
        return {
          message: `Here are our verified specialists in **${matchedSpecialty}**. Which practitioner would you like to schedule with?`,
          bookingDetails: state,
          bookingReady: false,
          doctorCards: matchingDocs.map(d => ({
            id: d._id.toString(),
            name: d.fullName,
            category: d.category,
            education: d.education,
            experience: d.experience,
            rating: d.rating,
            availableDays: d.availableDays,
            availableSlots: d.availableSlots
          })),
          suggestedActions: matchingDocs.map(d => `Dr. ${d.fullName}`)
        };
      }
    }

    // Default welcome greeting with active doctor directory preview
    return {
      message: `Hello ${patient.fullName || "there"}! I'm Medigo's AI Health & Booking Assistant. 🏥\n\nI can assist you with:\n• **Symptom guidance & clinical triage**\n• **Finding verified doctors by specialty**\n• **Instant appointment scheduling**\n\nWhat symptoms are you experiencing, or what specialty are you looking for?`,
      bookingDetails: state,
      bookingReady: false,
      options: ["Check Symptoms", "General Medicine", "Cardiology", "Dermatology", "Pediatrics", "Neurology"]
    };
  }

  const currentDoc = getSelectedDoc();
  if (!currentDoc) {
    state.doctorId = null;
    return {
      message: "Doctor selection was not found. Which specialist would you like to see?",
      bookingDetails: state,
      bookingReady: false
    };
  }

  // Step 2: Handle Date selection
  if (!state.date) {
    let matchedDate = null;
    const dateMatch = message.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (dateMatch) {
      matchedDate = dateMatch[0];
    } else if (msgLower.includes("today")) {
      matchedDate = formatDate(new Date());
    } else if (msgLower.includes("tomorrow")) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      matchedDate = formatDate(tomorrow);
    } else {
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      for (let i = 0; i < 7; i++) {
        if (msgLower.includes(daysOfWeek[i])) {
          const d = new Date();
          for (let offset = 1; offset <= 7; offset++) {
            const checkDate = new Date();
            checkDate.setDate(d.getDate() + offset);
            if (checkDate.getDay() === i) {
              matchedDate = formatDate(checkDate);
              break;
            }
          }
          break;
        }
      }
    }

    if (matchedDate) {
      const [year, month, day] = matchedDate.split("-").map(Number);
      const parsedDate = new Date(year, month - 1, day);
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const selectedDayName = days[parsedDate.getDay()];

      if (currentDoc.availableDays.includes(selectedDayName)) {
        state.date = matchedDate;
        return {
          message: `Perfect! **${matchedDate} (${selectedDayName})** is selected with **Dr. ${currentDoc.fullName}**.\n\nPlease choose your preferred time slot:`,
          bookingDetails: state,
          bookingReady: false,
          availableSlots: currentDoc.availableSlots,
          options: currentDoc.availableSlots
        };
      } else {
        const upcomingDates = getUpcomingAvailableDates(currentDoc.availableDays);
        return {
          message: `Dr. ${currentDoc.fullName} is available on **${currentDoc.availableDays.join(", ")}** (not on ${selectedDayName}s).\n\nPlease choose one of these available upcoming dates:`,
          bookingDetails: state,
          bookingReady: false,
          availableDates: upcomingDates,
          options: upcomingDates.map(d => d.date)
        };
      }
    }

    const upcomingDates = getUpcomingAvailableDates(currentDoc.availableDays);
    return {
      message: `Please pick an upcoming date for your consultation with **Dr. ${currentDoc.fullName}**:`,
      bookingDetails: state,
      bookingReady: false,
      availableDates: upcomingDates,
      options: upcomingDates.map(d => d.date)
    };
  }

  // Step 3: Handle Time Slot selection
  if (!state.time) {
    const matchedSlot = currentDoc.availableSlots.find(slot => {
      const slotClean = slot.toLowerCase().replace(/\s+/g, "");
      const msgClean = msgLower.replace(/\s+/g, "");
      return msgClean.includes(slotClean) ||
             msgClean.includes(slotClean.replace(":00", "")) ||
             (slotClean.includes("am") && msgClean.includes(slotClean.replace("am", "") + "am")) ||
             (slotClean.includes("pm") && msgClean.includes(slotClean.replace("pm", "") + "pm"));
    });

    if (matchedSlot) {
      state.time = matchedSlot;
      return {
        message: `### 📋 Appointment Booking Summary\n\n• **Practitioner**: Dr. ${currentDoc.fullName} (${currentDoc.category})\n• **Date**: ${state.date}\n• **Time**: ${state.time}\n• **Consultation Mode**: ${state.type}\n• **Reason**: ${state.reason}\n\nAre you ready to finalize this appointment? Please reply **'Confirm'** or **'Yes'**!`,
        bookingDetails: state,
        bookingReady: false,
        options: ["Confirm Booking", "Change Date/Time", "Cancel"]
      };
    }

    return {
      message: `Please select one of Dr. ${currentDoc.fullName}'s available time slots:`,
      bookingDetails: state,
      bookingReady: false,
      availableSlots: currentDoc.availableSlots,
      options: currentDoc.availableSlots
    };
  }

  // Step 4: Handle Confirmation
  if (
    msgLower.includes("yes") ||
    msgLower.includes("confirm") ||
    msgLower.includes("ok") ||
    msgLower.includes("yep") ||
    msgLower.includes("ready") ||
    msgLower.includes("book")
  ) {
    return {
      message: "Finalizing your consultation booking...",
      bookingDetails: state,
      bookingReady: true
    };
  }

  if (msgLower.includes("change") || msgLower.includes("cancel") || msgLower.includes("no")) {
    state.doctorId = null;
    state.date = null;
    state.time = null;
    return {
      message: "Booking reset. What specialty or doctor would you like to look for?",
      bookingDetails: state,
      bookingReady: false,
      options: ["General Medicine", "Cardiologist", "Dermatologist", "Pediatrician", "Neurologist"]
    };
  }

  return {
    message: `I'm waiting for your confirmation for **Dr. ${currentDoc.fullName}** on **${state.date} at ${state.time}**.\n\nPlease click or reply **'Confirm'** to finalize, or **'Change'** to select a different slot.`,
    bookingDetails: state,
    bookingReady: false,
    options: ["Confirm Booking", "Change Slot", "Cancel"]
  };
};

// Main controller endpoint
const bookingChat = async (req, res) => {
  try {
    const { message, history, bookingDetails } = req.body;
    const user = req.user;
    const isGuest = !user;
    const patient = user ? user : { fullName: "Guest Patient", isGuest: true };

    if (!message) {
      return res.status(400).json({ message: "Message content is required" });
    }

    // Resolve verified active practitioners
    const doctors = await User.find({ role: "doctor", isVerified: true }).select(
      "fullName email category availableDays availableSlots education experience rating"
    );

    let chatResponse;
    const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY";

    if (hasApiKey) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            responseMimeType: "application/json"
          },
          systemInstruction: `You are Medigo's AI health booking and symptom triage assistant.
Today's date is Monday, 2026-08-24.

Available Doctors:
${JSON.stringify(doctors, null, 2)}

Instructions:
1. Greet the patient: "${patient.fullName}".
2. Support both symptom questions (give helpful health guidance, advice, ethical disclaimer, and recommend the matching medical specialty/doctor) and direct booking.
3. If they choose a specialty or symptom, match doctors from the directory.
4. Verify dates match the doctor's available days.
5. Once doctor, date, and slot are agreed upon, summarize and ask confirmation.
6. When user confirms, set bookingReady: true.

Output JSON format:
{
  "message": "Friendly markdown response",
  "bookingDetails": {
    "doctorId": "string or null",
    "date": "YYYY-MM-DD or null",
    "time": "slot string or null",
    "type": "Video Consultation or Clinic Visit",
    "reason": "summary"
  },
  "bookingReady": boolean,
  "options": ["string suggestions"]
}`
        });

        const geminiHistory = (history || []).map((msg) => ({
          role: msg.role === "assistant" || msg.role === "model" ? "model" : "user",
          parts: [{ text: msg.content || msg.text || "" }]
        }));

        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        try {
          chatResponse = JSON.parse(responseText);
        } catch (jsonErr) {
          const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/{[\s\S]*}/);
          if (jsonMatch) {
            chatResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
          } else {
            throw new Error("Could not parse JSON response from Gemini");
          }
        }
      } catch (geminiErr) {
        console.error("Gemini API call failed, using intelligent fallback engine:", geminiErr.message);
        chatResponse = await handleFallbackChat(message, history, bookingDetails, doctors, patient);
      }
    } else {
      chatResponse = await handleFallbackChat(message, history, bookingDetails, doctors, patient);
    }

    // Process actual database booking if bookingReady
    if (chatResponse.bookingReady && chatResponse.bookingDetails) {
      const { doctorId, date, time, type, reason } = chatResponse.bookingDetails;

      // If guest user, prompt authentication without failing
      if (isGuest) {
        chatResponse.requiresAuth = true;
        chatResponse.bookingReady = false;
        chatResponse.message = `🎉 All your booking details are ready for consultation!\n\n• **Doctor**: Dr. ${(doctors.find(d => d._id.toString() === doctorId) || {}).fullName || "Selected Specialist"}\n• **Date & Time**: ${date} at ${time}\n\nTo officially finalize your booking and secure your appointment in our database, please **Sign In** or **Create an Account**.`;
        return res.json(chatResponse);
      }

      if (!doctorId || !date || !time) {
        chatResponse.message = "Some booking details were missing. Let's double check them.";
        chatResponse.bookingReady = false;
        return res.json(chatResponse);
      }

      const doctor = await User.findById(doctorId);
      if (!doctor || doctor.role !== "doctor") {
        chatResponse.message = "I couldn't find the selected doctor in our active practitioners list. Let's pick a different one.";
        chatResponse.bookingReady = false;
        return res.json(chatResponse);
      }

      // Create appointment entry
      const appointment = await Appointment.create({
        patientId: user._id,
        doctorId,
        clinicId: doctor.clinicId || null,
        doctorName: doctor.fullName,
        specialty: doctor.category || "General Medicine",
        patientName: user.fullName,
        date,
        time,
        type: type || "Video Consultation",
        reason: reason || "General Checkup",
        status: "Confirmed",
      });

      // Send email notifications
      try {
        await sendAppointmentCreatedEmail({
          patientEmail: user.email,
          patientName: user.fullName,
          doctorEmail: doctor.email,
          doctorName: doctor.fullName,
          date: appointment.date,
          time: appointment.time,
          type: appointment.type
        });
      } catch (emailErr) {
        console.error("Failed to send appointment confirmation emails:", emailErr.message);
      }

      // Trigger live in-app and Web Push notifications
      try {
        await createAndSendNotification({
          userId: user._id,
          title: "Appointment Booked via Medigo Carebot",
          message: `Your consultation with Dr. ${doctor.fullName} on ${date} at ${time} is confirmed.`,
          type: "appointment_confirmed",
          link: "/profile",
        });

        await createAndSendNotification({
          userId: doctorId,
          title: "New Appointment Booked",
          message: `${user.fullName} has booked a consultation with you on ${date} at ${time}.`,
          type: "appointment_created",
          link: "/doctor",
        });
      } catch (notifErr) {
        console.error("Failed to send in-app and push notifications:", notifErr.message);
      }

      chatResponse.message = `🎉 **Appointment Confirmed!**\n\nYour consultation with **Dr. ${doctor.fullName}** is successfully scheduled for **${date} at ${time}** (${type || "Video Consultation"}).\n\nConfirmation details have been emailed to you and added to your Dashboard!`;
      chatResponse.bookingConfirmed = true;
    }

    return res.json(chatResponse);
  } catch (err) {
    console.error("Booking chatbot controller error:", err);
    return res.status(500).json({
      message: "I encountered an error processing our chat. Could we try again?",
      bookingDetails: req.body.bookingDetails || null,
      bookingReady: false
    });
  }
};

module.exports = {
  bookingChat
};
