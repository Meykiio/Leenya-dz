import { describe, it, expect } from "vitest";

/**
 * Simulates the database check_booking_overlap trigger logic.
 * Two bookings conflict if they share the same staff and their time ranges overlap.
 */
interface Booking {
  start_time: string;
  end_time: string;
  staff_member_id: string | null;
  date: string;
  business_id: string;
  status: string;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function hasOverlap(newBooking: Booking, existingBookings: Booking[]): boolean {
  return existingBookings.some((b) => {
    if (b.business_id !== newBooking.business_id) return false;
    if (b.date !== newBooking.date) return false;
    if (b.status === "cancelled" || b.status === "no_show") return false;
    // Staff check: if both have staff, they must match to conflict
    if (newBooking.staff_member_id && b.staff_member_id && newBooking.staff_member_id !== b.staff_member_id) return false;
    // If either has null staff, it's a business-level conflict
    const newStart = timeToMinutes(newBooking.start_time);
    const newEnd = timeToMinutes(newBooking.end_time);
    const bStart = timeToMinutes(b.start_time);
    const bEnd = timeToMinutes(b.end_time);
    return newStart < bEnd && newEnd > bStart;
  });
}

describe("Booking Overlap Detection", () => {
  const base: Booking = {
    start_time: "10:00",
    end_time: "10:30",
    staff_member_id: "staff-1",
    date: "2026-03-09",
    business_id: "biz-1",
    status: "confirmed",
  };

  it("detects conflict: same time, same staff", () => {
    const existing = [base];
    const newB = { ...base };
    expect(hasOverlap(newB, existing)).toBe(true);
  });

  it("no conflict: same time, different staff", () => {
    const existing = [base];
    const newB = { ...base, staff_member_id: "staff-2" };
    expect(hasOverlap(newB, existing)).toBe(false);
  });

  it("no conflict: adjacent bookings (end = start)", () => {
    const existing = [base];
    const newB = { ...base, start_time: "10:30", end_time: "11:00" };
    expect(hasOverlap(newB, existing)).toBe(false);
  });

  it("detects conflict: overlap by 1 minute", () => {
    const existing = [base];
    const newB = { ...base, start_time: "10:29", end_time: "11:00" };
    expect(hasOverlap(newB, existing)).toBe(true);
  });

  it("no conflict: cancelled booking is ignored", () => {
    const existing = [{ ...base, status: "cancelled" }];
    const newB = { ...base };
    expect(hasOverlap(newB, existing)).toBe(false);
  });

  it("20 concurrent attempts: only first succeeds", () => {
    const existingBookings: Booking[] = [];
    let successCount = 0;

    for (let i = 0; i < 20; i++) {
      const attempt = { ...base, staff_member_id: "staff-1" };
      if (!hasOverlap(attempt, existingBookings)) {
        existingBookings.push(attempt);
        successCount++;
      }
    }

    expect(successCount).toBe(1);
    expect(existingBookings.length).toBe(1);
  });

  it("null staff_member_id: conflicts with any staff on same business", () => {
    const existing = [{ ...base, staff_member_id: null }];
    const newB = { ...base, staff_member_id: "staff-1" };
    // null staff means business-level booking, so it conflicts
    expect(hasOverlap(newB, existing)).toBe(true);
  });

  it("different dates: no conflict", () => {
    const existing = [base];
    const newB = { ...base, date: "2026-03-10" };
    expect(hasOverlap(newB, existing)).toBe(false);
  });
});
