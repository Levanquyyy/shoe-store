/**
 * TDD - Feature: Order Status Immutability
 *
 * Requirement: Once an order's status has been changed from its initial
 * "pending" value, any subsequent attempt to change it again must be rejected
 * with a BAD_REQUEST error. The first status change from "pending" is allowed;
 * every subsequent change is not.
 *
 * All DB calls are mocked so no live database is required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the db module BEFORE importing the router so the router picks up mocks
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

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-immutability-test",
    email: "admin-immutability@example.com",
    name: "Admin Immutability Tester",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

function createUserContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-immutability-${userId}`,
    email: `user-immutability-${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

/** A factory for a minimal order row as it comes back from the DB. */
function makePendingOrder(id: number = 1) {
  return {
    id,
    userId: 1,
    orderNumber: `ORD-TEST-${id}`,
    status: "pending" as const,
    subtotal: "99.99",
    shippingCost: "10.00",
    total: "109.99",
    shippingAddress: "{}",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeChangedOrder(id: number = 1, status: string = "processing") {
  return { ...makePendingOrder(id), status };
}

// ---------------------------------------------------------------------------
// Reset mocks between tests to prevent state leakage
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.resetAllMocks();
  // Default safe stubs (overridden per test where needed)
  vi.mocked(db.getAllOrders).mockResolvedValue([]);
  vi.mocked(db.getUserOrders).mockResolvedValue([]);
  vi.mocked(db.getOrderItems).mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Order Status Immutability", () => {
  // -------------------------------------------------------------------------
  // Happy path: the FIRST status change from pending must succeed
  // -------------------------------------------------------------------------

  it("allows the first status change away from pending", async () => {
    const orderId = 42;
    const pendingOrder = makePendingOrder(orderId);
    const updatedOrder = makeChangedOrder(orderId, "processing");

    vi.mocked(db.getOrderById).mockResolvedValue(pendingOrder as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(updatedOrder as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({
      orderId,
      status: "processing",
    });

    expect(result).toBeDefined();
    expect(vi.mocked(db.updateOrderStatus)).toHaveBeenCalledWith(
      orderId,
      "processing"
    );
  });

  it("allows changing status to shipped in the first update", async () => {
    const orderId = 43;
    vi.mocked(db.getOrderById).mockResolvedValue(makePendingOrder(orderId) as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(
      makeChangedOrder(orderId, "shipped") as any
    );

    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "shipped" })
    ).resolves.toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Immutability violation: second status change must be rejected
  // -------------------------------------------------------------------------

  it("rejects a second status change after the order was already updated", async () => {
    const orderId = 44;
    // Simulate DB already showing status = "processing" (first change happened)
    vi.mocked(db.getOrderById).mockResolvedValue(
      makeChangedOrder(orderId, "processing") as any
    );

    const caller = appRouter.createCaller(createAdminContext());

    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "shipped" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // updateOrderStatus must NOT be called — the guard should prevent it
    expect(vi.mocked(db.updateOrderStatus)).not.toHaveBeenCalled();
  });

  it("rejects a second change regardless of which new status is requested", async () => {
    const orderId = 45;
    vi.mocked(db.getOrderById).mockResolvedValue(
      makeChangedOrder(orderId, "shipped") as any
    );

    const caller = appRouter.createCaller(createAdminContext());

    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "delivered" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects reverting status back to pending once it was changed", async () => {
    const orderId = 46;
    vi.mocked(db.getOrderById).mockResolvedValue(
      makeChangedOrder(orderId, "cancelled") as any
    );

    const caller = appRouter.createCaller(createAdminContext());

    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "pending" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  it("rejects updating status of a non-existent order with NOT_FOUND", async () => {
    vi.mocked(db.getOrderById).mockResolvedValue(undefined as any);

    const caller = appRouter.createCaller(createAdminContext());

    await expect(
      caller.admin.orders.updateStatus({
        orderId: 999_999_999,
        status: "processing",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects status update by a non-admin user with FORBIDDEN", async () => {
    const userCaller = appRouter.createCaller(createUserContext(1));

    await expect(
      (userCaller as any).admin.orders.updateStatus({
        orderId: 1,
        status: "processing",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    // DB must never be touched by non-admin requests
    expect(vi.mocked(db.getOrderById)).not.toHaveBeenCalled();
  });

  it("returns the updated order row with the new status after a valid first change", async () => {
    const orderId = 47;
    const updatedOrder = makeChangedOrder(orderId, "processing");

    vi.mocked(db.getOrderById).mockResolvedValue(makePendingOrder(orderId) as any);
    vi.mocked(db.updateOrderStatus).mockResolvedValue(updatedOrder as any);

    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.admin.orders.updateStatus({
      orderId,
      status: "processing",
    });

    expect(result).toMatchObject({ status: "processing" });
  });

  // -------------------------------------------------------------------------
  // Concurrent update guard (race-condition scenario)
  // The guard reads the current status before writing. Two concurrent requests
  // on a pending order will both read "pending", but only one update should
  // logically win. In the mocked world we simulate this by having the second
  // getOrderById call return the already-changed order.
  // -------------------------------------------------------------------------

  it("rejects the second of two sequential status updates simulating a race", async () => {
    const orderId = 48;

    // First call sees pending, second call (after first update) sees changed
    vi.mocked(db.getOrderById)
      .mockResolvedValueOnce(makePendingOrder(orderId) as any)
      .mockResolvedValueOnce(makeChangedOrder(orderId, "processing") as any);

    vi.mocked(db.updateOrderStatus).mockResolvedValue(
      makeChangedOrder(orderId, "processing") as any
    );

    const caller = appRouter.createCaller(createAdminContext());

    // First update succeeds
    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "processing" })
    ).resolves.toBeDefined();

    // Second update (after first has committed) must be rejected
    await expect(
      caller.admin.orders.updateStatus({ orderId, status: "shipped" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });

    // updateOrderStatus is only called once (for the first request)
    expect(vi.mocked(db.updateOrderStatus)).toHaveBeenCalledTimes(1);
  });
});
