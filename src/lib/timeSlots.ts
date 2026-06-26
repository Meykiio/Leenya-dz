/**
 * Generate available time slots for a given date.
 * 
 * This function computes all available appointment slots based on:
 * - Business operating hours for the day
 * - Service duration
 * - Existing bookings (prevents overlap)
 * 
 * Time slots are generated in 15-minute increments.
 * 
 * @param hours - Business hours for the specific day (opens_at, closes_at, is_closed)
 * @param durationMinutes - Duration of the service in minutes
 * @param existingBookings - Array of existing bookings with start_time and end_time
 * @returns Array of available time slots in "HH:MM" format
 * 
 * @example
 * generateTimeSlots(
 *   { day_of_week: 1, opens_at: "09:00", closes_at: "18:00", is_closed: false },
 *   30,
 *   [{ start_time: "10:00", end_time: "10:30" }]
 * ) // → ["09:00", "09:15", "09:30", "09:45", "10:30", ...]
 */

interface BusinessHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean | null;
}

interface ExistingBooking {
  start_time: string;
  end_time: string;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function generateTimeSlots(
  hours: BusinessHour | undefined,
  durationMinutes: number,
  existingBookings: ExistingBooking[]
): string[] {
  if (!hours || hours.is_closed || !hours.opens_at || !hours.closes_at) {
    return [];
  }

  const open = timeToMinutes(hours.opens_at);
  const close = timeToMinutes(hours.closes_at);
  const slots: string[] = [];
  const step = 15; // 15-minute increments

  for (let start = open; start + durationMinutes <= close; start += step) {
    const end = start + durationMinutes;
    const overlaps = existingBookings.some((b) => {
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);
      return start < bEnd && end > bStart;
    });
    if (!overlaps) {
      slots.push(minutesToTime(start));
    }
  }

  return slots;
}

/**
 * Get the day of week from a Date object.
 * Returns JavaScript's getDay() value: 0=Sunday, 1=Monday, ..., 6=Saturday.
 * 
 * @param date - The date to extract day of week from
 * @returns Day of week as number (0-6)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0=Sunday
}

/**
 * Format a date into a compact label for UI display.
 * Returns French abbreviated day name, day number, and month.
 * 
 * @param date - The date to format
 * @returns Object with dayName (e.g., "Lun"), dayNum (e.g., 15), monthShort (e.g., "Mar")
 */
export function formatDateLabel(date: Date): { dayName: string; dayNum: number; monthShort: string } {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  return {
    dayName: days[date.getDay()],
    dayNum: date.getDate(),
    monthShort: months[date.getMonth()],
  };
}

/**
 * Format a date as ISO string (YYYY-MM-DD) for database queries.
 * 
 * @param date - The date to format
 * @returns Date string in "YYYY-MM-DD" format
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString().split("T")[0];
}
