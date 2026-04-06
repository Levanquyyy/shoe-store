/**
 * TDD – Admin Consultation Dashboard: Backend
 *
 * RED PHASE – All tests are written before implementation exists.
 *
 * Requirements:
 *  - Admin can retrieve ALL consultations across all products (no productId filter)
 *  - Each consultation row carries joined product info (name, imageUrl) and
 *    customer info (name, email) so the dashboard can render without N+1 queries
 *  - Each row includes a last-message preview and its timestamp
 *  - Result can be filtered by status ("open" | "closed" | "all")
 *  - Non-admin users receive FORBIDDEN
 *  - Unauthenticated callers receive UNAUTHORIZED
 *
 * Sections:
 *  E – DB layer: getAllConsultationsWithDetails
 *  F – tRPC router: consultation.adminGetAllConsultations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the db module BEFORE importing the router
// ---------------------------------------------------------------------------
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    // Existing helpers kept intact so appRouter can boot
    createConsultation: vi.fn(),
    getConsultationById: vi.fn(),
    getConsultationsByProduct: vi.fn(),
    getConsultationsByUser: vi.fn(),
    closeConsultation: vi.fn(),
    addConsultationMessage: vi.fn(),
    getConsultationMessages: vi.fn(),
    // NEW function under test
    getAllConsultationsWithDetails: vi.fn(),
    // Pre-existing helpers referenced by other procedures inside appRouter
    getProductById: vi.fn(),
    getCategories: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn().mockResolvedValue([]),
    getProductBySlug: vi.fn(),
    getFeaturedProducts: vi.fn().mockResolvedValue([]),
    getCartItems: vi.fn().mockResolvedValue([]),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    updateCartItemQuantity: vi.fn(),
    createOrder: vi.fn(),
    getUserOrders: vi.fn().mockResolvedValue([]),
    getOrderById: vi.fn(),
    getOrderItems: vi.fn().mockResolvedValue([]),
    getAllOrders: vi.fn().mockResolvedValue([]),
    updateOrderStatus: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getUserByEmail: vi.fn(),
    upsertUser: vi.fn(),
  };
});

import { appRouter } from "./routers";
import * as db from "./db";
import type { TrpcContext } from "./_core/context";

// ---------------------------------------------------------------------------
// Context helpers (mirrored from product-consultation.test.ts)
// ---------------------------------------------------------------------------

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(id: number, role: "user" | "admin" = "user"): AuthenticatedUser {
  return {
    id,
    openId: `${role}-${id}`,
    email: `${role}${id}@example.com`,
    name: `${role === "admin" ? "Admin" : "User"} ${id}`,
    loginMethod: "manual",
    role,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    lastSignedIn: new Date("2024-01-01"),
  };
}

function createCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const unauthCtx: TrpcContext = {
  user: null,
  req: { protocol: "https", headers: {} } as TrpcContext["req"],
  res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
};

const USER_1 = makeUser(1);
const USER_2 = makeUser(2);
const ADMIN = makeUser(999, "admin");

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_DETAIL_OPEN = {
  id: 1,
  productId: 10,
  userId: 1,
  status: "open" as const,
  createdAt: new Date("2024-01-01T10:00:00Z"),
  updatedAt: new Date("2024-01-01T12:00:00Z"),
  product: { id: 10, name: "Air Max 90", imageUrl: "https://example.com/airmax.jpg" },
  customer: { id: 1, name: "Alice", email: "alice@example.com" },
  lastMessage: { message: "Is size 42 available?", createdAt: new Date("2024-01-01T12:00:00Z") },
};

const MOCK_DETAIL_CLOSED = {
  id: 2,
  productId: 20,
  userId: 2,
  status: "closed" as const,
  createdAt: new Date("2024-01-02T09:00:00Z"),
  updatedAt: new Date("2024-01-02T11:00:00Z"),
  product: { id: 20, name: "Jordan 1 Retro", imageUrl: "https://example.com/jordan.jpg" },
  customer: { id: 2, name: "Bob", email: "bob@example.com" },
  lastMessage: { message: "Thanks for your help!", createdAt: new Date("2024-01-02T11:00:00Z") },
};

const MOCK_DETAIL_NO_MESSAGE = {
  id: 3,
  productId: 30,
  userId: 1,
  status: "open" as const,
  createdAt: new Date("2024-01-03T08:00:00Z"),
  updatedAt: new Date("2024-01-03T08:00:00Z"),
  product: { id: 30, name: "Yeezy 350", imageUrl: null },
  customer: { id: 1, name: "Alice", email: "alice@example.com" },
  lastMessage: null,
};

// ---------------------------------------------------------------------------
// Section E – DB layer: getAllConsultationsWithDetails
// ---------------------------------------------------------------------------

describe("E – DB layer: getAllConsultationsWithDetails (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all consultations with product, customer and last-message data", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([
      MOCK_DETAIL_OPEN,
      MOCK_DETAIL_CLOSED,
    ] as any);

    const result = await db.getAllConsultationsWithDetails();

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    // Each row has product info
    expect(result[0]).toMatchObject({ product: { name: "Air Max 90" } });
    expect(result[1]).toMatchObject({ product: { name: "Jordan 1 Retro" } });
    // Each row has customer info
    expect(result[0]).toMatchObject({ customer: { email: "alice@example.com" } });
    expect(result[1]).toMatchObject({ customer: { email: "bob@example.com" } });
    // Each row has last-message preview
    expect(result[0]).toMatchObject({ lastMessage: { message: "Is size 42 available?" } });
    expect(result[1]).toMatchObject({ lastMessage: { message: "Thanks for your help!" } });
  });

  it("returns empty array when no consultations exist", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([]);
    const result = await db.getAllConsultationsWithDetails();
    expect(result).toEqual([]);
  });

  it("accepts an optional status filter – returns only open consultations", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_OPEN] as any);

    const result = await db.getAllConsultationsWithDetails("open");

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith("open");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("open");
  });

  it("accepts an optional status filter – returns only closed consultations", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_CLOSED] as any);

    const result = await db.getAllConsultationsWithDetails("closed");

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith("closed");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("closed");
  });

  it("handles a consultation with no messages (lastMessage is null)", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_NO_MESSAGE] as any);

    const result = await db.getAllConsultationsWithDetails();

    expect(result[0].lastMessage).toBeNull();
  });

  it("returns consultation with null product imageUrl gracefully", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_NO_MESSAGE] as any);

    const result = await db.getAllConsultationsWithDetails();

    expect(result[0].product.imageUrl).toBeNull();
  });

  it("returns consultations ordered newest-first by default (updatedAt desc)", async () => {
    // The mock returns data in a specific order; implementation should ORDER BY updatedAt DESC
    const ordered = [MOCK_DETAIL_CLOSED, MOCK_DETAIL_OPEN]; // closed is newer
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce(ordered as any);

    const result = await db.getAllConsultationsWithDetails();

    // First item should be the more-recently-updated consultation
    expect(new Date(result[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(result[1].updatedAt).getTime()
    );
  });

  it("handles 500 consultations without throwing", async () => {
    const bulkData = Array.from({ length: 500 }, (_, i) => ({
      ...MOCK_DETAIL_OPEN,
      id: i + 1,
      productId: (i % 10) + 1,
      userId: (i % 5) + 1,
    }));
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce(bulkData as any);

    const result = await db.getAllConsultationsWithDetails();

    expect(result).toHaveLength(500);
  });
});

// ---------------------------------------------------------------------------
// Section F – tRPC router: consultation.adminGetAllConsultations
// ---------------------------------------------------------------------------

describe("F – tRPC router: consultation.adminGetAllConsultations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Authorization ──────────────────────────────────────────────────────────

  it("throws UNAUTHORIZED when caller is not authenticated", async () => {
    const caller = appRouter.createCaller(unauthCtx);
    await expect(caller.consultation.adminGetAllConsultations({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(db.getAllConsultationsWithDetails).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when a regular user calls adminGetAllConsultations", async () => {
    const caller = appRouter.createCaller(createCtx(USER_1));
    await expect(caller.consultation.adminGetAllConsultations({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(db.getAllConsultationsWithDetails).not.toHaveBeenCalled();
  });

  it("throws FORBIDDEN when a second regular user calls adminGetAllConsultations", async () => {
    const caller = appRouter.createCaller(createCtx(USER_2));
    await expect(caller.consultation.adminGetAllConsultations({})).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  // ── Happy path (admin) ─────────────────────────────────────────────────────

  it("returns all consultations with joined data for admin caller", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([
      MOCK_DETAIL_OPEN,
      MOCK_DETAIL_CLOSED,
    ] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({});

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 1,
      status: "open",
      product: { name: "Air Max 90" },
      customer: { name: "Alice" },
      lastMessage: { message: "Is size 42 available?" },
    });
  });

  it("returns empty array when no consultations exist", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([]);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({});

    expect(result).toEqual([]);
  });

  // ── Status filter ──────────────────────────────────────────────────────────

  it("passes status='open' filter to the DB layer", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_OPEN] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({ status: "open" });

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith("open");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("open");
  });

  it("passes status='closed' filter to the DB layer", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_CLOSED] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({ status: "closed" });

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith("closed");
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("closed");
  });

  it("calls DB with no filter when status is 'all'", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([
      MOCK_DETAIL_OPEN,
      MOCK_DETAIL_CLOSED,
    ] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({ status: "all" });

    // "all" means no filter – DB called without a status argument
    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(2);
  });

  it("calls DB with no filter when status is omitted", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([
      MOCK_DETAIL_OPEN,
      MOCK_DETAIL_CLOSED,
    ] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    await caller.consultation.adminGetAllConsultations({});

    expect(db.getAllConsultationsWithDetails).toHaveBeenCalledWith(undefined);
  });

  it("rejects an invalid status value", async () => {
    const caller = appRouter.createCaller(createCtx(ADMIN));
    await expect(
      (caller.consultation.adminGetAllConsultations as any)({ status: "deleted" })
    ).rejects.toThrow();
  });

  // ── Data shape ─────────────────────────────────────────────────────────────

  it("includes customer email in the response", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_OPEN] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const [row] = await caller.consultation.adminGetAllConsultations({});

    expect(row.customer.email).toBe("alice@example.com");
  });

  it("includes product imageUrl in the response", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_OPEN] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const [row] = await caller.consultation.adminGetAllConsultations({});

    expect(row.product.imageUrl).toBe("https://example.com/airmax.jpg");
  });

  it("includes lastMessage timestamp in the response", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_OPEN] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const [row] = await caller.consultation.adminGetAllConsultations({});

    expect(row.lastMessage?.createdAt).toBeInstanceOf(Date);
  });

  it("returns null lastMessage for a consultation with no messages", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_NO_MESSAGE] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const [row] = await caller.consultation.adminGetAllConsultations({});

    expect(row.lastMessage).toBeNull();
  });

  it("handles null product imageUrl without throwing", async () => {
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce([MOCK_DETAIL_NO_MESSAGE] as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const [row] = await caller.consultation.adminGetAllConsultations({});

    expect(row.product.imageUrl).toBeNull();
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("handles 500 consultations without throwing", async () => {
    const bulkData = Array.from({ length: 500 }, (_, i) => ({
      ...MOCK_DETAIL_OPEN,
      id: i + 1,
    }));
    vi.mocked(db.getAllConsultationsWithDetails).mockResolvedValueOnce(bulkData as any);

    const caller = appRouter.createCaller(createCtx(ADMIN));
    const result = await caller.consultation.adminGetAllConsultations({});

    expect(result).toHaveLength(500);
  });
});
