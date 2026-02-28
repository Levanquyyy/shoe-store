import { eq } from "drizzle-orm";
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
  return db.select().from(cartItems).where(eq(cartItems.userId, userId));
}

export async function addToCart(
  userId: number,
  productId: number,
  quantity: number,
  selectedSize: string
) {
  const db = await getDb();
  if (!db) return null;

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
    await db
      .update(cartItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existing[0].id));
    return existing[0];
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
    await db.insert(orderItems).values(
      orderItemsData.map((item) => ({
        ...item,
        orderId,
      }))
    );
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
