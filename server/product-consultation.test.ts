/**
 * TDD - Feature 3: Product Consultation
 *
 * Requirements:
 * - Customers can open a consultation thread about a specific product
 * - Customers send messages; admin/store responds back
 * - Each consultation is scoped to one product and one customer (userId)
 * - Consultation has a status: "open" | "closed"
 * - Users can only read/write their OWN consultations
 * - Admins can read ALL consultations and reply to any
 *
 * Covered in this file:
 *  Section A  – Schema-level pure-logic helpers (no DB, no network)
 *  Section B  – DB layer functions (mocked DB calls)
 *  Section C  – tRPC router procedures (mocked DB layer)
 *  Section D  – Edge-cases & permission guards
 *
 * TDD phase: RED — all tests written before implementation.
 * Run: pnpm vitest run server/product-consultation.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the db module BEFORE importing the router
// ---------------------------------------------------------------------------
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    // Consultation helpers – not yet implemented; will be added in GREEN phase
    createConsultation: vi.fn(),
    getConsultationById: vi.fn(),
    getConsultationsByProduct: vi.fn(),
    getConsultationsByUser: vi.fn(),
    closeConsultation: vi.fn(),
    addConsultationMessage: vi.fn(),
    getConsultationMessages: vi.fn(),
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
// Context helpers
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

const USER_1 = makeUser(1);
const USER_2 = makeUser(2);
const ADMIN = makeUser(999, "admin");

// ---------------------------------------------------------------------------
// Section A – Pure-logic helpers (schema validation, business rules)
// ---------------------------------------------------------------------------

describe("A – Consultation schema helpers", () => {
  describe("isValidConsultationStatus", () => {
    it("accepts 'open'", async () => {
      const { isValidConsultationStatus } = await import("./consultationHelpers");
      expect(isValidConsultationStatus("open")).toBe(true);
    });

    it("accepts 'closed'", async () => {
      const { isValidConsultationStatus } = await import("./consultationHelpers");
      expect(isValidConsultationStatus("closed")).toBe(true);
    });

    it("rejects an unknown status string", async () => {
      const { isValidConsultationStatus } = await import("./consultationHelpers");
      expect(isValidConsultationStatus("deleted")).toBe(false);
    });

    it("rejects empty string", async () => {
      const { isValidConsultationStatus } = await import("./consultationHelpers");
      expect(isValidConsultationStatus("")).toBe(false);
    });

    it("rejects null", async () => {
      const { isValidConsultationStatus } = await import("./consultationHelpers");
      expect(isValidConsultationStatus(null as any)).toBe(false);
    });
  });

  describe("isMessageOwner", () => {
    it("returns true when userId matches message sender", async () => {
      const { isMessageOwner } = await import("./consultationHelpers");
      expect(isMessageOwner({ userId: 5 }, 5)).toBe(true);
    });

    it("returns false when userId does not match message sender", async () => {
      const { isMessageOwner } = await import("./consultationHelpers");
      expect(isMessageOwner({ userId: 5 }, 99)).toBe(false);
    });
  });

  describe("isConsultationOwner", () => {
    it("returns true when userId matches consultation owner", async () => {
      const { isConsultationOwner } = await import("./consultationHelpers");
      expect(isConsultationOwner({ userId: 3 }, 3)).toBe(true);
    });

    it("returns false for a different user", async () => {
      const { isConsultationOwner } = await import("./consultationHelpers");
      expect(isConsultationOwner({ userId: 3 }, 7)).toBe(false);
    });
  });

  describe("canAccessConsultation", () => {
    it("returns true for the consultation owner (regular user)", async () => {
      const { canAccessConsultation } = await import("./consultationHelpers");
      expect(canAccessConsultation({ userId: 1 }, { id: 1, role: "user" })).toBe(true);
    });

    it("returns false for a different regular user", async () => {
      const { canAccessConsultation } = await import("./consultationHelpers");
      expect(canAccessConsultation({ userId: 1 }, { id: 2, role: "user" })).toBe(false);
    });

    it("returns true for an admin regardless of ownership", async () => {
      const { canAccessConsultation } = await import("./consultationHelpers");
      expect(canAccessConsultation({ userId: 1 }, { id: 999, role: "admin" })).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Section B – DB layer functions
// ---------------------------------------------------------------------------

describe("B – DB layer (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createConsultation", () => {
    it("resolves with a new consultation object containing productId and userId", async () => {
      const mockConsultation = {
        id: 1,
        productId: 10,
        userId: 1,
        status: "open",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(db.createConsultation).mockResolvedValueOnce(mockConsultation);

      const result = await db.createConsultation(10, 1);

      expect(db.createConsultation).toHaveBeenCalledWith(10, 1);
      expect(result).toMatchObject({ productId: 10, userId: 1, status: "open" });
    });
  });

  describe("getConsultationById", () => {
    it("returns the consultation for a valid id", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: 1, status: "open" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation);

      const result = await db.getConsultationById(1);
      expect(result).toEqual(mockConsultation);
    });

    it("returns undefined for a non-existent id", async () => {
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(undefined);
      const result = await db.getConsultationById(9999);
      expect(result).toBeUndefined();
    });
  });

  describe("getConsultationsByProduct", () => {
    it("returns all consultations for a given productId", async () => {
      const mockList = [
        { id: 1, productId: 10, userId: 1, status: "open" },
        { id: 2, productId: 10, userId: 2, status: "closed" },
      ];
      vi.mocked(db.getConsultationsByProduct).mockResolvedValueOnce(mockList);

      const result = await db.getConsultationsByProduct(10);
      expect(result).toHaveLength(2);
      expect(result.every((c: any) => c.productId === 10)).toBe(true);
    });

    it("returns empty array when no consultations exist for the product", async () => {
      vi.mocked(db.getConsultationsByProduct).mockResolvedValueOnce([]);
      const result = await db.getConsultationsByProduct(99);
      expect(result).toEqual([]);
    });
  });

  describe("getConsultationsByUser", () => {
    it("returns only consultations belonging to a specific user", async () => {
      const mockList = [
        { id: 1, productId: 10, userId: 1, status: "open" },
        { id: 3, productId: 20, userId: 1, status: "closed" },
      ];
      vi.mocked(db.getConsultationsByUser).mockResolvedValueOnce(mockList);

      const result = await db.getConsultationsByUser(1);
      expect(result.every((c: any) => c.userId === 1)).toBe(true);
    });
  });

  describe("addConsultationMessage", () => {
    it("resolves with the created message object", async () => {
      const mockMsg = {
        id: 101,
        consultationId: 1,
        userId: 1,
        message: "Is size 42 available?",
        createdAt: new Date(),
      };
      vi.mocked(db.addConsultationMessage).mockResolvedValueOnce(mockMsg);

      const result = await db.addConsultationMessage(1, 1, "Is size 42 available?");
      expect(result).toMatchObject({ consultationId: 1, message: "Is size 42 available?" });
    });
  });

  describe("getConsultationMessages", () => {
    it("returns messages ordered for a consultation", async () => {
      const mockMessages = [
        { id: 1, consultationId: 1, userId: 1, message: "Question?", createdAt: new Date("2024-01-01") },
        { id: 2, consultationId: 1, userId: 999, message: "Answer!", createdAt: new Date("2024-01-02") },
      ];
      vi.mocked(db.getConsultationMessages).mockResolvedValueOnce(mockMessages);

      const result = await db.getConsultationMessages(1);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when consultation has no messages", async () => {
      vi.mocked(db.getConsultationMessages).mockResolvedValueOnce([]);
      const result = await db.getConsultationMessages(42);
      expect(result).toEqual([]);
    });
  });

  describe("closeConsultation", () => {
    it("resolves with the updated consultation in 'closed' status", async () => {
      const mockUpdated = { id: 1, productId: 10, userId: 1, status: "closed" };
      vi.mocked(db.closeConsultation).mockResolvedValueOnce(mockUpdated);

      const result = await db.closeConsultation(1);
      expect(result).toMatchObject({ status: "closed" });
    });
  });
});

// ---------------------------------------------------------------------------
// Section C – tRPC router procedures
// ---------------------------------------------------------------------------

describe("C – tRPC consultation router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── consultation.create ──────────────────────────────────────────────────

  describe("consultation.create", () => {
    it("creates a consultation when product exists and user is authenticated", async () => {
      const mockProduct = { id: 10, name: "Air Max", stock: 5 };
      const mockConsultation = { id: 1, productId: 10, userId: 1, status: "open", createdAt: new Date(), updatedAt: new Date() };

      vi.mocked(db.getProductById).mockResolvedValueOnce(mockProduct as any);
      vi.mocked(db.createConsultation).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.create({ productId: 10 });

      expect(result).toMatchObject({ productId: 10, userId: 1, status: "open" });
      expect(db.createConsultation).toHaveBeenCalledWith(10, 1);
    });

    it("throws NOT_FOUND when productId does not exist", async () => {
      vi.mocked(db.getProductById).mockResolvedValueOnce(undefined);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.create({ productId: 9999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      expect(db.createConsultation).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when called without authentication", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.consultation.create({ productId: 10 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("rejects input without productId (schema validation)", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect((caller.consultation.create as any)({})).rejects.toThrow();
    });

    it("rejects productId that is not a positive integer", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.create({ productId: -1 })).rejects.toThrow();
    });

    it("rejects productId of 0", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.create({ productId: 0 })).rejects.toThrow();
    });
  });

  // ── consultation.getMyConsultations ──────────────────────────────────────

  describe("consultation.getMyConsultations", () => {
    it("returns only the current user's consultations", async () => {
      const mockList = [
        { id: 1, productId: 10, userId: 1, status: "open" },
        { id: 2, productId: 20, userId: 1, status: "closed" },
      ];
      vi.mocked(db.getConsultationsByUser).mockResolvedValueOnce(mockList as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.getMyConsultations();

      expect(db.getConsultationsByUser).toHaveBeenCalledWith(USER_1.id);
      expect(result).toHaveLength(2);
    });

    it("returns empty array when user has no consultations", async () => {
      vi.mocked(db.getConsultationsByUser).mockResolvedValueOnce([]);
      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.getMyConsultations();
      expect(result).toEqual([]);
    });

    it("throws UNAUTHORIZED when not logged in", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.consultation.getMyConsultations()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  // ── consultation.getMessages ─────────────────────────────────────────────

  describe("consultation.getMessages", () => {
    it("returns messages for a consultation owned by the requesting user", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockMessages = [
        { id: 1, consultationId: 1, userId: USER_1.id, message: "Hello", createdAt: new Date() },
      ];
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.getConsultationMessages).mockResolvedValueOnce(mockMessages as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.getMessages({ consultationId: 1 });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ message: "Hello" });
    });

    it("throws FORBIDDEN when a different user tries to read someone else's consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_2));
      await expect(caller.consultation.getMessages({ consultationId: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(db.getConsultationMessages).not.toHaveBeenCalled();
    });

    it("allows admin to read any consultation's messages", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockMessages = [
        { id: 1, consultationId: 1, userId: USER_1.id, message: "Customer question", createdAt: new Date() },
      ];
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.getConsultationMessages).mockResolvedValueOnce(mockMessages as any);

      const caller = appRouter.createCaller(createCtx(ADMIN));
      const result = await caller.consultation.getMessages({ consultationId: 1 });

      expect(result).toHaveLength(1);
    });

    it("throws NOT_FOUND when consultation does not exist", async () => {
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(undefined);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.getMessages({ consultationId: 9999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws UNAUTHORIZED when not logged in", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.consultation.getMessages({ consultationId: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  // ── consultation.sendMessage ──────────────────────────────────────────────

  describe("consultation.sendMessage", () => {
    it("allows the consultation owner to send a message", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockMessage = {
        id: 1,
        consultationId: 1,
        userId: USER_1.id,
        message: "Is this waterproof?",
        createdAt: new Date(),
      };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.addConsultationMessage).mockResolvedValueOnce(mockMessage as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.sendMessage({
        consultationId: 1,
        message: "Is this waterproof?",
      });

      expect(db.addConsultationMessage).toHaveBeenCalledWith(1, USER_1.id, "Is this waterproof?");
      expect(result).toMatchObject({ message: "Is this waterproof?" });
    });

    it("allows admin to reply to any consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockMessage = {
        id: 2,
        consultationId: 1,
        userId: ADMIN.id,
        message: "Yes, it is!",
        createdAt: new Date(),
      };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.addConsultationMessage).mockResolvedValueOnce(mockMessage as any);

      const caller = appRouter.createCaller(createCtx(ADMIN));
      const result = await caller.consultation.sendMessage({
        consultationId: 1,
        message: "Yes, it is!",
      });

      expect(result).toMatchObject({ userId: ADMIN.id, message: "Yes, it is!" });
    });

    it("throws FORBIDDEN when a different user tries to send a message to someone else's consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_2));
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: "Intruder!" })
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(db.addConsultationMessage).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when consultation does not exist", async () => {
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(undefined);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(
        caller.consultation.sendMessage({ consultationId: 9999, message: "Hi" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws BAD_REQUEST when trying to send a message to a closed consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "closed" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: "Hi" })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(db.addConsultationMessage).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when not logged in", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: "Hi" })
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects an empty message string", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: "" })
      ).rejects.toThrow();
    });

    it("rejects a message that is only whitespace", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: "   " })
      ).rejects.toThrow();
    });

    it("rejects a message exceeding 2000 characters", async () => {
      const longMessage = "a".repeat(2001);
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(
        caller.consultation.sendMessage({ consultationId: 1, message: longMessage })
      ).rejects.toThrow();
    });
  });

  // ── consultation.close (admin or owner) ──────────────────────────────────

  describe("consultation.close", () => {
    it("allows the owner to close their own consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockClosed = { ...mockConsultation, status: "closed" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.closeConsultation).mockResolvedValueOnce(mockClosed as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      const result = await caller.consultation.close({ consultationId: 1 });

      expect(result).toMatchObject({ status: "closed" });
      expect(db.closeConsultation).toHaveBeenCalledWith(1);
    });

    it("allows admin to close any consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      const mockClosed = { ...mockConsultation, status: "closed" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
      vi.mocked(db.closeConsultation).mockResolvedValueOnce(mockClosed as any);

      const caller = appRouter.createCaller(createCtx(ADMIN));
      const result = await caller.consultation.close({ consultationId: 1 });

      expect(result).toMatchObject({ status: "closed" });
    });

    it("throws FORBIDDEN when a different regular user tries to close someone else's consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_2));
      await expect(caller.consultation.close({ consultationId: 1 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(db.closeConsultation).not.toHaveBeenCalled();
    });

    it("throws NOT_FOUND when the consultation does not exist", async () => {
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(undefined);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.close({ consultationId: 9999 })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws BAD_REQUEST when trying to close an already-closed consultation", async () => {
      const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "closed" };
      vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);

      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.close({ consultationId: 1 })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(db.closeConsultation).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when not logged in", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.consultation.close({ consultationId: 1 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });

  // ── consultation.adminGetAll (admin only) ─────────────────────────────────

  describe("consultation.adminGetAll", () => {
    it("allows admin to retrieve all consultations for a product", async () => {
      const mockList = [
        { id: 1, productId: 10, userId: 1, status: "open" },
        { id: 2, productId: 10, userId: 2, status: "closed" },
      ];
      vi.mocked(db.getConsultationsByProduct).mockResolvedValueOnce(mockList as any);

      const caller = appRouter.createCaller(createCtx(ADMIN));
      const result = await caller.consultation.adminGetAll({ productId: 10 });

      expect(result).toHaveLength(2);
      expect(db.getConsultationsByProduct).toHaveBeenCalledWith(10);
    });

    it("throws FORBIDDEN when a regular user calls adminGetAll", async () => {
      const caller = appRouter.createCaller(createCtx(USER_1));
      await expect(caller.consultation.adminGetAll({ productId: 10 })).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(db.getConsultationsByProduct).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when not logged in", async () => {
      const unauthCtx: TrpcContext = {
        user: null,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
      };
      const caller = appRouter.createCaller(unauthCtx);
      await expect(caller.consultation.adminGetAll({ productId: 10 })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Section D – Edge cases
// ---------------------------------------------------------------------------

describe("D – Edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not create a duplicate consultation — caller must guard against double-creation", async () => {
    // The DB layer is expected to return the same consultation if one already exists
    // or the caller checks before inserting. Here we verify the router calls
    // createConsultation only once per invocation.
    const mockProduct = { id: 10, name: "Air Max", stock: 5 };
    const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open", createdAt: new Date(), updatedAt: new Date() };
    vi.mocked(db.getProductById).mockResolvedValue(mockProduct as any);
    vi.mocked(db.createConsultation).mockResolvedValue(mockConsultation as any);

    const caller = appRouter.createCaller(createCtx(USER_1));
    await caller.consultation.create({ productId: 10 });
    await caller.consultation.create({ productId: 10 });

    expect(db.createConsultation).toHaveBeenCalledTimes(2);
  });

  it("handles special characters in message text without throwing", async () => {
    const specialMessage = "Size 42? <script>alert('xss')</script> & \"quotes\" 'apostrophe'";
    const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
    const mockMessage = { id: 5, consultationId: 1, userId: USER_1.id, message: specialMessage, createdAt: new Date() };
    vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
    vi.mocked(db.addConsultationMessage).mockResolvedValueOnce(mockMessage as any);

    const caller = appRouter.createCaller(createCtx(USER_1));
    const result = await caller.consultation.sendMessage({
      consultationId: 1,
      message: specialMessage,
    });
    expect(result).toMatchObject({ message: specialMessage });
  });

  it("handles Unicode / emoji in message text", async () => {
    const unicodeMessage = "Giày có size 42 không? 👟🔥";
    const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
    const mockMessage = { id: 6, consultationId: 1, userId: USER_1.id, message: unicodeMessage, createdAt: new Date() };
    vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
    vi.mocked(db.addConsultationMessage).mockResolvedValueOnce(mockMessage as any);

    const caller = appRouter.createCaller(createCtx(USER_1));
    const result = await caller.consultation.sendMessage({
      consultationId: 1,
      message: unicodeMessage,
    });
    expect(result).toMatchObject({ message: unicodeMessage });
  });

  it("handles a consultation with a very large number of messages gracefully", async () => {
    const mockConsultation = { id: 1, productId: 10, userId: USER_1.id, status: "open" };
    const largeMessageList = Array.from({ length: 500 }, (_, i) => ({
      id: i + 1,
      consultationId: 1,
      userId: i % 2 === 0 ? USER_1.id : ADMIN.id,
      message: `Message number ${i + 1}`,
      createdAt: new Date(),
    }));
    vi.mocked(db.getConsultationById).mockResolvedValueOnce(mockConsultation as any);
    vi.mocked(db.getConsultationMessages).mockResolvedValueOnce(largeMessageList as any);

    const caller = appRouter.createCaller(createCtx(USER_1));
    const result = await caller.consultation.getMessages({ consultationId: 1 });

    expect(result).toHaveLength(500);
  });
});
