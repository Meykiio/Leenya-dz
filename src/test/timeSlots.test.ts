import { describe, it, expect } from "vitest";
import { generateTimeSlots, getDayOfWeek, formatDateLabel, formatDateForDB } from "@/lib/timeSlots";

describe("generateTimeSlots", () => {
  const standardHours = {
    day_of_week: 1,
    opens_at: "09:00",
    closes_at: "17:00",
    is_closed: false,
  };

  it("generates correct slots for 30min service in 09:00–17:00", () => {
    const slots = generateTimeSlots(standardHours, 30, []);
    // First slot at 09:00, last slot at 16:30 (16:30+30=17:00)
    expect(slots[0]).toBe("09:00");
    expect(slots[slots.length - 1]).toBe("16:30");
    // 15-min increments: (17:00 - 09:00) = 480min, slots where start+30<=480 → starts 0..450 step 15 → 31 slots
    expect(slots.length).toBe(31);
  });

  it("returns empty array for closed days", () => {
    const closed = { ...standardHours, is_closed: true };
    expect(generateTimeSlots(closed, 30, [])).toEqual([]);
  });

  it("returns empty for undefined hours", () => {
    expect(generateTimeSlots(undefined, 30, [])).toEqual([]);
  });

  it("returns empty when opens_at or closes_at is null", () => {
    expect(generateTimeSlots({ ...standardHours, opens_at: null }, 30, [])).toEqual([]);
    expect(generateTimeSlots({ ...standardHours, closes_at: null }, 30, [])).toEqual([]);
  });

  it("filters out slots overlapping with existing bookings", () => {
    const bookings = [{ start_time: "10:00", end_time: "10:30" }];
    const slots = generateTimeSlots(standardHours, 30, bookings);
    // Slots that would overlap: start in [09:31..10:29] where start+30 > 10:00 && start < 10:30
    // Blocked starts: 09:45 (09:45+30=10:15 > 10:00 && 09:45 < 10:30) ✓
    //                 10:00 (10:00+30=10:30 > 10:00 && 10:00 < 10:30) ✓
    //                 10:15 (10:15+30=10:45 > 10:00 && 10:15 < 10:30) ✓
    expect(slots).not.toContain("09:45");
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:15");
    // Adjacent slot should be available
    expect(slots).toContain("09:30");
    expect(slots).toContain("10:30");
  });

  it("does not generate slots overflowing past closing time", () => {
    const slots = generateTimeSlots(standardHours, 60, []);
    // Last valid start: 16:00 (16:00+60=17:00)
    expect(slots[slots.length - 1]).toBe("16:00");
    expect(slots).not.toContain("16:15");
    expect(slots).not.toContain("16:30");
  });

  it("handles service duration exactly equal to remaining time", () => {
    const short = { ...standardHours, opens_at: "16:00", closes_at: "17:00" };
    const slots = generateTimeSlots(short, 60, []);
    expect(slots).toEqual(["16:00"]);
  });

  it("handles booking at the very start of business hours", () => {
    const bookings = [{ start_time: "09:00", end_time: "09:30" }];
    const slots = generateTimeSlots(standardHours, 30, bookings);
    expect(slots).not.toContain("09:00");
    expect(slots).not.toContain("09:15");
    expect(slots).toContain("09:30");
  });

  it("handles booking at the very end of business hours", () => {
    const bookings = [{ start_time: "16:30", end_time: "17:00" }];
    const slots = generateTimeSlots(standardHours, 30, bookings);
    expect(slots).not.toContain("16:30");
    expect(slots).toContain("16:00");
  });

  it("handles 20 non-overlapping bookings correctly", () => {
    // Create 20 bookings: 09:00-09:15, 09:30-09:45, ... every 30 min
    const bookings = Array.from({ length: 20 }, (_, i) => {
      const startMin = 540 + i * 24; // spread across the day
      const h = Math.floor(startMin / 60);
      const m = startMin % 60;
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const endMin = startMin + 15;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      const end = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
      return { start_time: start, end_time: end };
    });
    const slots = generateTimeSlots(standardHours, 15, bookings);
    // Verify no slot overlaps with any booking
    for (const slot of slots) {
      const [sh, sm] = slot.split(":").map(Number);
      const slotStart = sh * 60 + sm;
      const slotEnd = slotStart + 15;
      for (const b of bookings) {
        const [bsh, bsm] = b.start_time.split(":").map(Number);
        const [beh, bem] = b.end_time.split(":").map(Number);
        const bStart = bsh * 60 + bsm;
        const bEnd = beh * 60 + bem;
        const overlaps = slotStart < bEnd && slotEnd > bStart;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("returns no slots when service is longer than business hours", () => {
    const short = { ...standardHours, opens_at: "09:00", closes_at: "09:30" };
    expect(generateTimeSlots(short, 60, [])).toEqual([]);
  });
});

describe("getDayOfWeek", () => {
  it("returns 0 for Sunday", () => {
    expect(getDayOfWeek(new Date("2026-03-08"))).toBe(0); // March 8, 2026 is Sunday
  });
});

describe("formatDateLabel", () => {
  it("returns French day/month names", () => {
    const result = formatDateLabel(new Date("2026-03-09")); // Monday
    expect(result.dayName).toBe("Lun");
    expect(result.dayNum).toBe(9);
    expect(result.monthShort).toBe("Mar");
  });
});

describe("formatDateForDB", () => {
  it("returns YYYY-MM-DD format", () => {
    const d = new Date("2026-03-08T15:00:00Z");
    expect(formatDateForDB(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
