import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, categories, products, cartItems, orders, orderItems } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Category queries
 */
export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories);
}

/**
 * Product queries
 */
export async function getProducts(filters?: {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query: any = db.select().from(products);

  if (filters?.categoryId) {
    query = query.where(eq(products.categoryId, filters.categoryId));
  }

  const results = await query;

  return results.filter((p: any) => {
    if (filters?.minPrice && parseFloat(p.price) < filters.minPrice) return false;
    if (filters?.maxPrice && parseFloat(p.price) > filters.maxPrice) return false;
    if (filters?.sizes && filters.sizes.length > 0) {
      const productSizes = p.sizes || [];
      return filters.sizes.some((s) => productSizes.includes(s));
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result[0];
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0];
}

export async function getFeaturedProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.featured, 1)).limit(8);
}

/**
 * Cart queries
 */
export async function getCartItems(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const { sql } = await import("drizzle-orm");

  return db
    .select({
      id: cartItems.id,
      userId: cartItems.userId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      selectedSize: cartItems.selectedSize,
      product: {
        id: products.id,
        name: products.name,
        slug: products.slug,
        price: products.price,
        imageUrl: products.imageUrl,
        description: products.description,
      },
    })
    .from(cartItems)
    .leftJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.userId, userId));
}

export async function addToCart(
  userId: number,
  productId: number,
  quantity: number,
  selectedSize: string
) {
  const db = await getDb();
  if (!db) return null;

  // Check product stock
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!product.length) {
    throw new Error("Product not found");
  }

  const availableStock = product[0].stock;

  // Check existing cart item
  const existing = await db
    .select()
    .from(cartItems)
    .where(
      eq(cartItems.userId, userId) &&
        eq(cartItems.productId, productId) &&
        eq(cartItems.selectedSize, selectedSize)
    )
    .limit(1);

  if (existing.length > 0) {
    const newQuantity = (existing[0]?.quantity || 0) + quantity;
    if (newQuantity > availableStock) {
      throw new Error(`Only ${availableStock} items available. You already have ${existing[0]?.quantity || 0} in cart.`);
    }
    await db
      .update(cartItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0];
  }

  // Validate stock for new item
  if (quantity > availableStock) {
    throw new Error(`Only ${availableStock} items available in stock`);
  }

  await db.insert(cartItems).values({
    userId,
    productId,
    quantity,
    selectedSize,
  });

  return null;
}

export async function removeFromCart(cartItemId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return true;
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  const db = await getDb();
  if (!db) return null;

  if (quantity < 1) {
    throw new Error("Quantity must be at least 1");
  }

  // Get cart item to find product
  const cartItem = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.id, cartItemId))
    .limit(1);

  if (!cartItem.length) {
    throw new Error("Cart item not found");
  }

  // Check product stock
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, cartItem[0].productId))
    .limit(1);

  if (!product.length) {
    throw new Error("Product not found");
  }

  if (quantity > product[0].stock) {
    throw new Error(`Only ${product[0].stock} items available in stock`);
  }

  return db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, cartItemId));
}

/**
 * Order queries
 */
export async function createOrder(
  userId: number,
  orderNumber: string,
  subtotal: string,
  shippingCost: string,
  total: string,
  shippingAddress: any,
  orderItemsData: any[]
) {
  const db = await getDb();
  if (!db) return null;

  // Validate stock before creating order
  for (const item of orderItemsData) {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, item.productId))
      .limit(1);

    if (!product.length) {
      throw new Error(`Product ${item.productId} not found`);
    }

    if (item.quantity > product[0].stock) {
      throw new Error(`Insufficient stock for ${product[0].name}. Only ${product[0].stock} available.`);
    }
  }

  const result = await db.insert(orders).values({
    userId,
    orderNumber,
    subtotal,
    shippingCost,
    total,
    shippingAddress,
  });

  const orderId = result[0]?.insertId || 0;

  if (orderId && orderItemsData.length > 0) {
    // Insert order items
    await db.insert(orderItems).values(
      orderItemsData.map((item) => ({
        ...item,
        orderId,
      }))
    );

    // Reduce product stock
    for (const item of orderItemsData) {
      await db
        .update(products)
        .set({
          stock: sql`stock - ${item.quantity}`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, item.productId));
    }

    // Clear user's cart after successful order
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  return orderId;
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId));
}

export async function getOrderById(orderId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return result[0];
}

export async function getOrderItems(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];

  const allOrders = await db.select().from(orders);

  // Fetch items for each order
  const ordersWithItems = await Promise.all(
    allOrders.map(async (order) => {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));
      return {
        ...order,
        items,
      };
    })
  );

  return ordersWithItems;
}

export async function updateOrderStatus(orderId: number, status: string) {
  const db = await getDb();
  if (!db) return null;
  return db
    .update(orders)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}

/**
 * Admin queries
 */
export async function createProduct(data: any) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(products).values(data);
}

export async function updateProduct(id: number, data: any) {
  const db = await getDb();
  if (!db) return null;
  return db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(products).where(eq(products.id, id));
  return true;
}

export async function createCategory(data: any) {
  const db = await getDb();
  if (!db) return null;
  return db.insert(categories).values(data);
}

export async function updateCategory(id: number, data: any) {
  const db = await getDb();
  if (!db) return null;
  return db.update(categories).set({ ...data, updatedAt: new Date() }).where(eq(categories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) return false;
  await db.delete(categories).where(eq(categories.id, id));
  return true;
}

export async function updateUserRole(openId: string, role: "user" | "admin") {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update user role: database not available");
    return;
  }

  await db.update(users).set({ role }).where(eq(users.openId, openId));
}
