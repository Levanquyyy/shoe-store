import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 999,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as TrpcContext["res"],
  };
}

describe("E-Commerce Features", () => {
  describe("Products Router", () => {
    it("should list all products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.products.list({});
      expect(Array.isArray(products)).toBe(true);
    });

    it("should get featured products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const featured = await caller.products.featured();
      expect(Array.isArray(featured)).toBe(true);
    });

    it("should filter products by category", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.products.list({ categoryId: 1 });
      expect(Array.isArray(products)).toBe(true);
    });

    it("should filter products by price range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.products.list({
        minPrice: 50,
        maxPrice: 150,
      });
      expect(Array.isArray(products)).toBe(true);
      products.forEach((product: any) => {
        const price = parseFloat(product.price);
        expect(price).toBeGreaterThanOrEqual(50);
        expect(price).toBeLessThanOrEqual(150);
      });
    });

    it("should search products by name", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const products = await caller.products.list({ search: "shoe" });
      expect(Array.isArray(products)).toBe(true);
    });
  });

  describe("Cart Router", () => {
    it("should list user's cart items", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const cartItems = await caller.cart.list();
      expect(Array.isArray(cartItems)).toBe(true);
    });

    it("should add item to cart", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.cart.add({
        productId: 1,
        quantity: 1,
        selectedSize: "10",
      });
      expect(Array.isArray(result)).toBe(true);
    });

    it("should update cart item quantity", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First add an item
      await caller.cart.add({
        productId: 1,
        quantity: 1,
        selectedSize: "10",
      });

      // Get cart items to find the ID
      const cartItems = await caller.cart.list();
      if (cartItems.length > 0) {
        const cartItemId = cartItems[0].id;

        // Update quantity
        const updated = await caller.cart.updateQuantity({
          cartItemId,
          quantity: 2,
        });

        expect(Array.isArray(updated)).toBe(true);
        const updatedItem = updated.find((item: any) => item.id === cartItemId);
        expect(updatedItem?.quantity).toBe(2);
      }
    });

    it("should remove item from cart", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First add an item
      await caller.cart.add({
        productId: 1,
        quantity: 1,
        selectedSize: "10",
      });

      // Get cart items
      const cartItems = await caller.cart.list();
      if (cartItems.length > 0) {
        const cartItemId = cartItems[0].id;

        // Remove item
        const updated = await caller.cart.remove({ cartItemId });
        expect(Array.isArray(updated)).toBe(true);
      }
    });
  });

  describe("Orders Router", () => {
    it("should list user's orders", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const orders = await caller.orders.list();
      expect(Array.isArray(orders)).toBe(true);
    });

    it("should create an order", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.orders.create({
        orderNumber: `ORD-${Date.now()}`,
        subtotal: "99.99",
        shippingCost: "10.00",
        total: "109.99",
        shippingAddress: {
          fullName: "John Doe",
          email: "john@example.com",
          phone: "555-1234",
          address: "123 Main St",
          city: "New York",
          state: "NY",
          zipCode: "10001",
          country: "USA",
        },
        items: [
          {
            productId: 1,
            productName: "Test Shoe",
            price: "99.99",
            quantity: 1,
            selectedSize: "10",
          },
        ],
      });

      expect(result).toHaveProperty("orderId");
      expect(typeof result.orderId).toBe("number");
    });
  });

  describe("Admin Router", () => {
    it("should allow admin to create products", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.admin.products.create({
        name: "Test Running Shoe",
        slug: "test-running-shoe",
        description: "A high-performance running shoe",
        price: "129.99",
        categoryId: 1,
        sizes: ["6", "7", "8", "9", "10", "11", "12"],
        stock: 50,
        imageUrl: "https://example.com/shoe.jpg",
      });

      expect(result).toHaveProperty("id");
    });

    it("should prevent non-admin from creating products", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.admin.products.create({
          name: "Test Shoe",
          slug: "test-shoe",
          description: "Test",
          price: "99.99",
          categoryId: 1,
          sizes: ["10"],
          stock: 10,
        });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });

    it("should allow admin to delete products", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create a product first
      const created = await caller.admin.products.create({
        name: "Test Shoe to Delete",
        slug: "test-shoe-delete",
        description: "Test",
        price: "99.99",
        categoryId: 1,
        sizes: ["10"],
        stock: 10,
      });

      // Delete it
      const result = await caller.admin.products.delete({ id: created.id });
      expect(result).toBeDefined();
    });
  });

  describe("Categories Router", () => {
    it("should list all categories", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.categories.list();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  describe("Authentication", () => {
    it("should get current user info", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const user = await caller.auth.me();
      expect(user).toEqual(ctx.user);
    });

    it("should logout user", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.logout();
      expect(result).toEqual({ success: true });
    });
  });
});
