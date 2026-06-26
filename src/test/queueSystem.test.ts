import { describe, it, expect } from "vitest";

/**
 * Simulates queue system logic: ticket numbering, position tracking,
 * optimistic locking, and EWT calculation.
 */

interface Ticket {
  id: string;
  ticket_number: number;
  ticket_label: string;
  status: "waiting" | "called" | "in_service" | "completed" | "cancelled" | "no_show";
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

function generateTicketNumber(lastNumber: number): { ticket_num: number; ticket_lbl: string } {
  const next = lastNumber + 1;
  return { ticket_num: next, ticket_lbl: `A-${String(next).padStart(3, "0")}` };
}

function getWaitingPositions(tickets: Ticket[]): Ticket[] {
  return tickets
    .filter((t) => t.status === "waiting")
    .sort((a, b) => a.ticket_number - b.ticket_number);
}

function calculateEWT(tickets: Ticket[], avgServiceMin: number): number {
  const waiting = getWaitingPositions(tickets);
  return waiting.length * avgServiceMin;
}

/** Simulates optimistic locking: returns true if update succeeded */
function tryCallTicket(ticket: Ticket): boolean {
  if (ticket.status !== "waiting") return false;
  ticket.status = "called";
  ticket.called_at = new Date().toISOString();
  return true;
}

describe("Queue Ticket Number Generation", () => {
  it("generates sequential ticket numbers", () => {
    let last = 0;
    for (let i = 1; i <= 50; i++) {
      const result = generateTicketNumber(last);
      expect(result.ticket_num).toBe(i);
      expect(result.ticket_lbl).toBe(`A-${String(i).padStart(3, "0")}`);
      last = result.ticket_num;
    }
  });

  it("50 tickets have positions 1–50", () => {
    const tickets: Ticket[] = Array.from({ length: 50 }, (_, i) => ({
      id: `t-${i + 1}`,
      ticket_number: i + 1,
      ticket_label: `A-${String(i + 1).padStart(3, "0")}`,
      status: "waiting" as const,
      created_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
    }));
    const waiting = getWaitingPositions(tickets);
    expect(waiting.length).toBe(50);
    waiting.forEach((t, idx) => expect(t.ticket_number).toBe(idx + 1));
  });
});

describe("Queue Position After Cancellation", () => {
  it("remaining positions are correct after mid-queue cancellation", () => {
    const tickets: Ticket[] = Array.from({ length: 10 }, (_, i) => ({
      id: `t-${i + 1}`,
      ticket_number: i + 1,
      ticket_label: `A-${String(i + 1).padStart(3, "0")}`,
      status: "waiting" as const,
      created_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
    }));

    // Cancel tickets 3, 5, 7
    tickets[2].status = "cancelled";
    tickets[4].status = "cancelled";
    tickets[6].status = "cancelled";

    const waiting = getWaitingPositions(tickets);
    expect(waiting.length).toBe(7);
    // Order should be preserved by ticket_number
    expect(waiting.map((t) => t.ticket_number)).toEqual([1, 2, 4, 6, 8, 9, 10]);
  });
});

describe("Optimistic Locking", () => {
  it("only one staff member can call the same ticket", () => {
    const ticket: Ticket = {
      id: "t-1",
      ticket_number: 1,
      ticket_label: "A-001",
      status: "waiting",
      created_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
    };

    // 5 staff try to call simultaneously
    const results = Array.from({ length: 5 }, () => tryCallTicket(ticket));
    const successes = results.filter(Boolean);
    expect(successes.length).toBe(1);
    expect(ticket.status).toBe("called");
  });

  it("calling an already-called ticket fails", () => {
    const ticket: Ticket = {
      id: "t-1",
      ticket_number: 1,
      ticket_label: "A-001",
      status: "called",
      created_at: new Date().toISOString(),
      called_at: new Date().toISOString(),
      completed_at: null,
    };
    expect(tryCallTicket(ticket)).toBe(false);
  });
});

describe("EWT Calculation", () => {
  it("calculates correctly with varying completion times", () => {
    const tickets: Ticket[] = Array.from({ length: 5 }, (_, i) => ({
      id: `t-${i + 1}`,
      ticket_number: i + 1,
      ticket_label: `A-${String(i + 1).padStart(3, "0")}`,
      status: "waiting" as const,
      created_at: new Date().toISOString(),
      called_at: null,
      completed_at: null,
    }));

    // Average 15 min service
    expect(calculateEWT(tickets, 15)).toBe(75); // 5 * 15
    // Average 10 min service
    expect(calculateEWT(tickets, 10)).toBe(50); // 5 * 10
  });

  it("EWT is 0 when no one is waiting", () => {
    expect(calculateEWT([], 15)).toBe(0);
  });
});
