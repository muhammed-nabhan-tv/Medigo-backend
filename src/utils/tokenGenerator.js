/**
 * Utility for parsing 12h/24h times, calculating consultation intervals,
 * excluding doctor breaks, and dispatching sequential appointment tokens.
 */

const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const cleaned = timeStr.trim();
  
  // Check 12-hour format with AM/PM (e.g. "10:00 AM", "03:30 PM", "12:30PM")
  const match12 = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let [_, hoursStr, minutesStr, ampm] = match12;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Check 24-hour format (e.g. "14:30")
  const match24 = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
};

const minutesToTime = (totalMinutes) => {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  let hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const padHours = String(hours).padStart(2, "0");
  const padMinutes = String(minutes).padStart(2, "0");
  return `${padHours}:${padMinutes} ${ampm}`;
};

/**
 * Generate sequential tokens given a start time, end time, duration in minutes, and breaks.
 * @param {Object} options
 * @param {string} options.startTime e.g. "10:00 AM"
 * @param {string} options.endTime e.g. "03:00 PM"
 * @param {number} options.duration e.g. 15
 * @param {Array<{startTime: string, endTime: string}>} [options.breaks]
 * @returns {Array<{tokenNumber: number, startTime: string, endTime: string, displayTime: string}>}
 */
const generateTokensForSchedule = ({ startTime, endTime, duration = 15, breaks = [] }) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const dur = parseInt(duration, 10) || 15;

  if (startMin >= endMin || dur <= 0) {
    return [];
  }

  // Parse breaks into minute intervals
  const parsedBreaks = (breaks || [])
    .map((b) => ({
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
    }))
    .filter((b) => b.start < b.end);

  const tokens = [];
  let tokenNumber = 1;
  let current = startMin;

  while (current + dur <= endMin) {
    const slotStart = current;
    const slotEnd = current + dur;

    // Check if this slot overlaps with ANY break
    // Overlap formula: slotStart < breakEnd && slotEnd > breakStart
    const overlapsBreak = parsedBreaks.some(
      (b) => slotStart < b.end && slotEnd > b.start
    );

    if (!overlapsBreak) {
      const formattedStart = minutesToTime(slotStart);
      const formattedEnd = minutesToTime(slotEnd);
      tokens.push({
        tokenNumber,
        startTime: formattedStart,
        endTime: formattedEnd,
        displayTime: `${formattedStart} - ${formattedEnd}`,
      });
      tokenNumber++;
    }

    current += dur;
  }

  return tokens;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Returns a default weekly schedule for a doctor
 */
const getDefaultWeeklySchedule = () => {
  return DAYS_OF_WEEK.map((day) => {
    const isWeekend = day === "Saturday" || day === "Sunday";
    const startTime = "10:00 AM";
    const endTime = "03:00 PM";
    const consultationDuration = 15;
    const breaks = isWeekend ? [] : [{ startTime: "12:30 PM", endTime: "01:00 PM" }];
    const tokens = isWeekend
      ? []
      : generateTokensForSchedule({ startTime, endTime, duration: consultationDuration, breaks });

    return {
      day,
      isActive: !isWeekend,
      startTime,
      endTime,
      consultationDuration,
      breaks,
      tokens,
    };
  });
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  generateTokensForSchedule,
  getDefaultWeeklySchedule,
  DAYS_OF_WEEK,
};
