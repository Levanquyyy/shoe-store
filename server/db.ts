import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import {
  InsertUser,
  users,
  categories,
  products,
  cartItems,
  orders,
  orderItems,
  productConsultations,
  consultationMessages,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = mysql.createPool(process.env.DATABASE_URL);
      }
      _db = drizzle(_pool) as any;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
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

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
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

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user by email: database not available");
    return undefined;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

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
      if (!filters.sizes.some((s: string) => productSizes.includes(s))) return false;
    }
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(searchLower) &&
        !p.description?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
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

  const availableStock = product[0].stock ?? 0;

  // Check existing cart item
  const existing = await db
    .select()
    .from(cartItems)
    .where(and(
      eq(cartItems.userId, userId),
      eq(cartItems.productId, productId),
      eq(cartItems.selectedSize, selectedSize)
    ))
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

  const productStock = product[0].stock ?? 0;
  if (quantity > productStock) {
    throw new Error(`Only ${productStock} items available in stock`);
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

    const productStock = product[0].stock ?? 0;
    if (item.quantity > productStock) {
      throw new Error(`Insufficient stock for ${product[0].name}. Only ${productStock} available.`);
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
  await db
    .update(orders)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  const updated = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return updated[0] ?? null;
}

export async function searchOrders(params: {
  orderNumber?: string;
  status?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const allOrders = await getAllOrders();

  let results = allOrders;

  if (params.orderNumber) {
    const searchTerm = params.orderNumber.toLowerCase().trim();
    results = results.filter((order) =>
      order.orderNumber.toLowerCase().includes(searchTerm)
    );
  }

  if (params.status) {
    results = results.filter((order) => order.status === params.status);
  }

  if (params.limit && params.limit > 0) {
    results = results.slice(0, params.limit);
  }

  return results;
}

export async function getOrderByNumber(orderNumber: string) {
  const db = await getDb();
  if (!db) return null;

  const allOrders = await getAllOrders();
  const order = allOrders.find(
    (o) => o.orderNumber.toLowerCase() === orderNumber.toLowerCase()
  );

  return order || null;
}

export type ProductSalesSummaryItem = {
  productId: number;
  productName: string;
  quantity: number;
  revenue: string;
};

export type ProductSalesSummary = {
  totalRevenue: string;
  totalUnitsSold: number;
  topProducts: ProductSalesSummaryItem[];
};

type SalesOrder = {
  status?: string | null;
  total: string;
  items?: Array<{
    productId: number;
    productName: string;
    price: string;
    quantity: number;
  }>;
};

export function summarizeProductSales(orders: SalesOrder[], limit = 5): ProductSalesSummary {
  const salesByProduct = new Map<
    number,
    { productId: number; productName: string; quantity: number; revenue: number }
  >();

  let totalRevenue = 0;
  let totalUnitsSold = 0;

  for (const order of orders) {
    if ((order.status ?? "pending") === "cancelled") {
      continue;
    }

    totalRevenue += Number.parseFloat(order.total as string) || 0;

    for (const item of order.items ?? []) {
      const itemRevenue = (Number.parseFloat(item.price as string) || 0) * (item.quantity || 0);
      const current = salesByProduct.get(item.productId) ?? {
        productId: item.productId,
        productName: item.productName,
        quantity: 0,
        revenue: 0,
      };

      current.quantity += item.quantity || 0;
      current.revenue += itemRevenue;
      salesByProduct.set(item.productId, current);
      totalUnitsSold += item.quantity || 0;
    }
  }

  const topProducts = [...salesByProduct.values()]
    .sort((left, right) => {
      if (right.quantity !== left.quantity) return right.quantity - left.quantity;
      if (right.revenue !== left.revenue) return right.revenue - left.revenue;
      return left.productName.localeCompare(right.productName);
    })
    .slice(0, limit)
    .map((product) => ({
      productId: product.productId,
      productName: product.productName,
      quantity: product.quantity,
      revenue: product.revenue.toFixed(2),
    }));

  return {
    totalRevenue: totalRevenue.toFixed(2),
    totalUnitsSold,
    topProducts,
  };
}

export async function getProductSalesSummary(limit = 5): Promise<ProductSalesSummary> {
  const allOrders = await getAllOrders();
  return summarizeProductSales(allOrders as SalesOrder[], limit);
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

/**
 * Product Consultation queries
 */

export async function createConsultation(productId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(productConsultations).values({ productId, userId });
  const insertId = result[0]?.insertId;
  if (!insertId) return null;

  const rows = await db
    .select()
    .from(productConsultations)
    .where(eq(productConsultations.id, insertId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConsultationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(productConsultations)
    .where(eq(productConsultations.id, id))
    .limit(1);
  return rows[0];
}

export async function getConsultationsByProduct(productId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(productConsultations)
    .where(eq(productConsultations.productId, productId));
}

export async function getConsultationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(productConsultations)
    .where(eq(productConsultations.userId, userId));
}

export async function closeConsultation(id: number) {
  const db = await getDb();
  if (!db) return null;
  await db
    .update(productConsultations)
    .set({ status: "closed", updatedAt: new Date() })
    .where(eq(productConsultations.id, id));
  const rows = await db
    .select()
    .from(productConsultations)
    .where(eq(productConsultations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function addConsultationMessage(
  consultationId: number,
  userId: number,
  message: string
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(consultationMessages).values({
    consultationId,
    userId,
    message,
  });
  const insertId = result[0]?.insertId;
  if (!insertId) return null;

  const rows = await db
    .select()
    .from(consultationMessages)
    .where(eq(consultationMessages.id, insertId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getConsultationMessages(consultationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consultationMessages)
    .where(eq(consultationMessages.consultationId, consultationId));
}

export type ConsultationWithDetails = {
  id: number;
  productId: number;
  userId: number;
  status: "open" | "closed";
  createdAt: Date;
  updatedAt: Date;
  product: { id: number; name: string; imageUrl: string | null };
  customer: { id: number; name: string; email: string };
  lastMessage: { message: string; createdAt: Date } | null;
};

/**
 * Returns all consultations with joined product info, customer info, and
 * the last message preview. Optionally filtered by status.
 * Results are ordered by updatedAt descending (newest first).
 */
export async function getAllConsultationsWithDetails(
  status?: "open" | "closed"
): Promise<ConsultationWithDetails[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: productConsultations.id,
      productId: productConsultations.productId,
      userId: productConsultations.userId,
      status: productConsultations.status,
      createdAt: productConsultations.createdAt,
      updatedAt: productConsultations.updatedAt,
      productName: products.name,
      productImageUrl: products.imageUrl,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(productConsultations)
    .innerJoin(products, eq(productConsultations.productId, products.id))
    .innerJoin(users, eq(productConsultations.userId, users.id))
    .where(status ? eq(productConsultations.status, status) : undefined)
    .orderBy(desc(productConsultations.updatedAt));

  const results: ConsultationWithDetails[] = await Promise.all(
    rows.map(async (row) => {
      const lastMessages = await db
        .select({ message: consultationMessages.message, createdAt: consultationMessages.createdAt })
        .from(consultationMessages)
        .where(eq(consultationMessages.consultationId, row.id))
        .orderBy(desc(consultationMessages.createdAt))
        .limit(1);

      return {
        id: row.id,
        productId: row.productId,
        userId: row.userId,
        status: row.status as "open" | "closed",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        product: {
          id: row.productId,
          name: row.productName,
          imageUrl: row.productImageUrl ?? null,
        },
        customer: {
          id: row.userId,
          name: row.customerName ?? "",
          email: row.customerEmail ?? "",
        },
        lastMessage: lastMessages.length > 0 ? lastMessages[0] : null,
      };
    })
  );

  return results;
}
