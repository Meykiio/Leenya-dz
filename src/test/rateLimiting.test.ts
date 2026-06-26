import { describe, it, expect } from "vitest";

/**
 * Simulates the database rate limit trigger logic:
 * check_insert_rate_limit counts records from the same phone in the last 10 minutes.
 * If >= 10, the insert is rejected.
 */

interface RateLimitEntry {
  client_phone: string;
  created_at: Date;
}

function checkRateLimit(phone: string, existingEntries: RateLimitEntry[], now: Date): boolean {
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const cutoff = new Date(now.getTime() - windowMs);
  const recentCount = existingEntries.filter(
    (e) => e.client_phone === phone && e.created_at > cutoff
  ).length;
  return recentCount < 10; // true = allowed, false = blocked
}

describe("Rate Limiting Logic", () => {
  const now = new Date("2026-03-08T12:00:00Z");
  const phone = "0555123456";

  it("allows 9 requests within 10 minutes", () => {
    const entries: RateLimitEntry[] = Array.from({ length: 9 }, (_, i) => ({
      client_phone: phone,
      created_at: new Date(now.getTime() - i * 30_000), // spread across 4.5 min
    }));
    expect(checkRateLimit(phone, entries, now)).toBe(true);
  });

  it("blocks 10th request within 10 minutes", () => {
    const entries: RateLimitEntry[] = Array.from({ length: 10 }, (_, i) => ({
      client_phone: phone,
      created_at: new Date(now.getTime() - i * 30_000),
    }));
    expect(checkRateLimit(phone, entries, now)).toBe(false);
  });

  it("different phones have independent limits", () => {
    const entries: RateLimitEntry[] = Array.from({ length: 10 }, (_, i) => ({
      client_phone: "0666999888",
      created_at: new Date(now.getTime() - i * 30_000),
    }));
    // phone "0555123456" has 0 entries
    expect(checkRateLimit(phone, entries, now)).toBe(true);
  });

  it("allows requests after 10-minute window expires", () => {
    const entries: RateLimitEntry[] = Array.from({ length: 15 }, (_, i) => ({
      client_phone: phone,
      created_at: new Date(now.getTime() - 11 * 60_000 - i * 1000), // all > 11 min ago
    }));
    expect(checkRateLimit(phone, entries, now)).toBe(true);
  });

  it("mixed old and recent: only recent count", () => {
    const entries: RateLimitEntry[] = [
      // 8 old entries (> 10 min ago)
      ...Array.from({ length: 8 }, (_, i) => ({
        client_phone: phone,
        created_at: new Date(now.getTime() - 15 * 60_000 - i * 1000),
      })),
      // 9 recent entries
      ...Array.from({ length: 9 }, (_, i) => ({
        client_phone: phone,
        created_at: new Date(now.getTime() - i * 30_000),
      })),
    ];
    expect(checkRateLimit(phone, entries, now)).toBe(true); // 9 < 10
  });
});
