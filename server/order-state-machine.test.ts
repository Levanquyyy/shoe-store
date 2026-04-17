/**
 * TDD – Order Status State Machine
 *
 * Tests the strict sequential state machine for order status transitions.
 *
 * Rules under test:
 *  1. Forward-only transitions: pending -> processing -> shipped -> delivered
 *  2. Cancel is allowed from pending or processing only
 *  3. No skipping steps (pending -> shipped is invalid)
 *  4. No backward transitions (processing -> pending is invalid)
 *  5. Terminal states (delivered, cancelled) cannot transition further
 *  6. getNextStatus returns the correct next step or null for terminals
 *  7. tRPC router enforces state machine on admin.orders.updateStatus
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidTransition,
  getNextStatus,
  getTransitionErrorMessage,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_SEQUENCE,
  type OrderStatus,
} from "../shared/orderStateMachine";

// ---------------------------------------------------------------------------
// Mock db before importing router
// ---------------------------------------------------------------------------
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
    getAllOrders: vi.fn().mockResolvedValue([]),
    createOrder: vi.fn(),
    getUserOrders: vi.fn().mockResolvedValue([]),
    getOrderItems: vi.fn().mockResolvedValue([]),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-state-machine",
    email: "admin-sm@example.com",
    name: "Admin State Machine Tester",
    passwordHash: null,
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as any,
  };
}

function createUserContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user-${userId}@example.com`,
    name: `User ${userId}`,
    passwordHash: null,
    loginMethod: "local",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as any,
  };
}

function makeOrder(id: number, status: OrderStatus) {
  return {
    id,
    userId: 1,
    orderNumber: `ORD-SM-${id}`,
    status,
    subtotal: "99.99",
    shippingCost: "10.00",
    total: "109.99",
    shippingAddress: "{}",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(db.getAllOrders).mockResolvedValue([]);
  vi.mocked(db.getUserOrders).mockResolvedValue([]);
  vi.mocked(db.getOrderItems).mockResolvedValue([]);
});

// ===========================================================================
// Unit tests: isValidTransition
// ===========================================================================

describe("isValidTransition", () => {
  // ── Valid forward transitions ────────────────────────────────────────────

  it("allows pending -> processing", () => {
    expect(isValidTransition("pending", "processing")).toBe(true);
  });

  it("allows processing -> shipped", () => {
    expect(isValidTransition("processing", "shipped")).toBe(true);
  });

  it("allows shipped -> delivered", () => {
    expect(isValidTransition("shipped", "delivered")).toBe(true);
  });

  it("allows pending -> cancelled", () => {
    expect(isValidTransition("pending", "cancelled")).toBe(true);
  });

  it("allows processing -> cancelled", () => {
    expect(isValidTransition("processing", "cancelled")).toBe(true);
  });

  // ── Skipping steps is rejected ──────────────────────────────────────────

  it("rejects pending -> shipped (skip processing)", () => {
    expect(isValidTransition("pending", "shipped")).toBe(false);
  });

  it("rejects pending -> delivered (skip two steps)", () => {
    expect(isValidTransition("pending", "delivered")).toBe(false);
  });

  it("rejects processing -> delivered (skip shipped)", () => {
    expect(isValidTransition("processing", "delivered")).toBe(false);
  });

  // ── Backward transitions are rejected ───────────────────────────────────

  it("rejects processing -> pending (backward)", () => {
    expect(isValidTransition("processing", "pending")).toBe(false);
  });

  it("rejects shipped -> processing (backward)", () => {
    expect(isValidTransition("shipped", "processing")).toBe(false);
  });

  it("rejects shipped -> pending (backward two steps)", () => {
    expect(isValidTransition("shipped", "pending")).toBe(false);
  });

  it("rejects delivered -> shipped (backward from terminal)", () => {
    expect(isValidTransition("delivered", "shipped")).toBe(false);
  });

  // ── Same-status is rejected ──────────────────────────────────────────────

  it("rejects pending -> pending (no-op)", () => {
    expect(isValidTransition("pending", "pending")).toBe(false);
  });

  it("rejects delivered -> delivered (no-op on terminal)", () => {
    expect(isValidTransition("delivered", "delivered")).toBe(false);
  });

  // ── Terminal states cannot transition ───────────────────────────────────

  it("rejects delivered -> any status (terminal state)", () => {
    const allStatuses: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
    allStatuses.forEach((to) => {
      expect(isValidTransition("delivered", to)).toBe(false);
    });
  });

  it("rejects cancelled -> any status (terminal state)", () => {
    const allStatuses: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];
    allStatuses.forEach((to) => {
      expect(isValidTransition("cancelled", to)).toBe(false);
    });
  });

  // ── Cancelled cannot be re-cancelled ────────────────────────────────────

  it("rejects shipped -> cancelled (too late to cancel)", () => {
    expect(isValidTransition("shipped", "cancelled")).toBe(false);
  });

  it("rejects delivered -> cancelled (terminal, cannot cancel)", () => {
    expect(isValidTransition("delivered", "cancelled")).toBe(false);
  });
});

// ===========================================================================
// Unit tests: getNextStatus
// ===========================================================================

describe("getNextStatus", () => {
  it("returns processing as next status for pending", () => {
    expect(getNextStatus("pending")).toBe("processing");
  });

  it("returns shipped as next status for processing", () => {
    expect(getNextStatus("processing")).toBe("shipped");
  });

  it("returns delivered as next status for shipped", () => {
    expect(getNextStatus("shipped")).toBe("delivered");
  });

  it("returns null for delivered (terminal)", () => {
    expect(getNextStatus("delivered")).toBeNull();
  });

  it("returns null for cancelled (terminal)", () => {
    expect(getNextStatus("cancelled")).toBeNull();
  });
});

// ===========================================================================
// Unit tests: getTransitionErrorMessage
// ===========================================================================

describe("getTransitionErrorMessage", () => {
  it("returns a message mentioning the terminal state for delivered", () => {
    const msg = getTransitionErrorMessage("delivered", "pending");
    expect(msg).toMatch(/terminal/i);
  });

  it("returns a message mentioning the terminal state for cancelled", () => {
    const msg = getTransitionErrorMessage("cancelled", "pending");
    expect(msg).toMatch(/terminal/i);
  });

  it("returns a message mentioning allowed next statuses for invalid skip", () => {
    const msg = getTransitionErrorMessage("pending", "shipped");
    // The message uses Vietnamese labels – "Đang xử lý" is the label for "processing"
    expect(msg.toLowerCase()).toContain("xử lý");
  });

  it("returns a message indicating same-status transition", () => {
    const msg = getTransitionErrorMessage("pending", "pending");
    expect(msg).toBeTruthy();
  });
});

// ===========================================================================
// Unit tests: ORDER_STATUS_TRANSITIONS and ORDER_STATUS_SEQUENCE
// ===========================================================================

describe("ORDER_STATUS_TRANSITIONS shape", () => {
  it("all five statuses are present as keys", () => {
    const keys = Object.keys(ORDER_STATUS_TRANSITIONS);
    expect(keys).toContain("pending");
    expect(keys).toContain("processing");
    expect(keys).toContain("shipped");
    expect(keys).toContain("delivered");
    expect(keys).toContain("cancelled");
  });

  it("delivered has no allowed transitions (terminal)", () => {
    expect(ORDER_STATUS_TRANSITIONS.delivered).toHaveLength(0);
  });

  it("cancelled has no allowed transitions (terminal)", () => {
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it("pending has exactly two allowed next statuses (processing, cancelled)", () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toHaveLength(2);
    expect(ORDER_STATUS_TRANSITIONS.pending).toContain("processing");
    expect(ORDER_STATUS_TRANSITIONS.pending).toContain("cancelled");
  });
});

describe("ORDER_STATUS_SEQUENCE", () => {
  it("starts with pending", () => {
    expect(ORDER_STATUS_SEQUENCE[0]).toBe("pending");
  });

  it("ends with delivered", () => {
    expect(ORDER_STATUS_SEQUENCE[ORDER_STATUS_SEQUENCE.length - 1]).toBe("delivered");
  });

  it("has four items in the main sequence", () => {
    expect(ORDER_STATUS_SEQUENCE).toHaveLength(4);
  });

  it("does not include cancelled in the main sequence", () => {
    expect(ORDER_STATUS_SEQUENCE).not.toContain("cancelled");
  });
});

// ===========================================================================
// Integration tests: tRPC router enforces state machine
// ===========================================================================

describe("admin.orders.updateStatus – state machine enforcement", () => {
  // ── Valid transitions succeed ──────────────────────────────────────────────

  it("allows pending -> processing", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(1, "pending") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(1, "processing") as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({ orderId: 1, status: "processing" });

    expect(result).toMatchObject({ status: "processing" });
    expect(vi.mocked(db.updateOrderStatus)).toHaveBeenCalledWith(1, "processing");
  });

  it("allows processing -> shipped", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(2, "processing") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(2, "shipped") as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({ orderId: 2, status: "shipped" });

    expect(result).toMatchObject({ status: "shipped" });
  });

  it("allows shipped -> delivered", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(3, "shipped") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(3, "delivered") as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({ orderId: 3, status: "delivered" });

    expect(result).toMatchObject({ status: "delivered" });
  });

  it("allows pending -> cancelled", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(4, "pending") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(4, "cancelled") as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({ orderId: 4, status: "cancelled" });

    expect(result).toMatchObject({ status: "cancelled" });
  });

  it("allows processing -> cancelled", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(5, "processing") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(5, "cancelled") as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({ orderId: 5, status: "cancelled" });

    expect(result).toMatchObject({ status: "cancelled" });
  });

  // ── Skipping steps is rejected ──────────────────────────────────────────

  it("rejects pending -> shipped (skip processing)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(10, "pending") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 10, status: "shipped" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(vi.mocked(db.updateOrderStatus)).not.toHaveBeenCalled();
  });

  it("rejects pending -> delivered (skip two steps)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(11, "pending") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 11, status: "delivered" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects processing -> delivered (skip shipped)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(12, "processing") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 12, status: "delivered" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // ── Backward transitions are rejected ───────────────────────────────────

  it("rejects processing -> pending (backward)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(20, "processing") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 20, status: "pending" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects shipped -> processing (backward)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(21, "shipped") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 21, status: "processing" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects shipped -> cancelled (cannot cancel after shipped)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(22, "shipped") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 22, status: "cancelled" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // ── Terminal states are locked ───────────────────────────────────────────

  it("rejects any update from delivered (terminal)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(30, "delivered") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 30, status: "shipped" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects any update from cancelled (terminal)", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(31, "cancelled") as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 31, status: "processing" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it("returns NOT_FOUND for non-existent order", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId: 9999, status: "processing" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ===========================================================================
// Integration tests: user cancellation route
// ===========================================================================

describe("orders.cancel – user cancellation flow", () => {
  it("allows the owner to cancel a pending order", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(40, "pending") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(40, "cancelled") as any);

    const caller = appRouter.createCaller(createUserContext(1));
    const result = await caller.orders.cancel({ orderId: 40 });

    expect(result).toMatchObject({ status: "cancelled" });
    expect(vi.mocked(db.updateOrderStatus)).toHaveBeenCalledWith(40, "cancelled");
  });

  it("allows the owner to cancel a processing order", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(41, "processing") as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(makeOrder(41, "cancelled") as any);

    const caller = appRouter.createCaller(createUserContext(1));
    const result = await caller.orders.cancel({ orderId: 41 });

    expect(result).toMatchObject({ status: "cancelled" });
  });

  it("rejects cancellation after shipped", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(makeOrder(42, "shipped") as any);

    const caller = appRouter.createCaller(createUserContext(1));

    await expect(caller.orders.cancel({ orderId: 42 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(vi.mocked(db.updateOrderStatus)).not.toHaveBeenCalled();
  });

  it("rejects cancellation for orders owned by another user", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue({ ...makeOrder(43, "pending"), userId: 2 } as any);

    const caller = appRouter.createCaller(createUserContext(1));

    await expect(caller.orders.cancel({ orderId: 43 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
