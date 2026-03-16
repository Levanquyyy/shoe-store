import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, verifyPassword } from "./_core/password";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getCategories,
  getProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  getCartItems,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  createOrder,
  getUserOrders,
  getOrderById,
  getOrderItems,
  getAllOrders,
  updateOrderStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  getUserByEmail,
  upsertUser,
} from "./db";
import { TRPCError } from "@trpc/server";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(
        z.object({
          name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
          email: z.string().email("Email không hợp lệ"),
          password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email đã được sử dụng",
          });
        }

        const openId = `local:${email}`;
        await upsertUser({
          openId,
          name: input.name.trim(),
          email,
          passwordHash: hashPassword(input.password),
          loginMethod: "manual",
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: input.name.trim(),
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true } as const;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("Email không hợp lệ"),
          password: z.string().min(1, "Vui lòng nhập mật khẩu"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const email = input.email.trim().toLowerCase();
        const user = await getUserByEmail(email);

        if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Email hoặc mật khẩu không đúng",
          });
        }

        await upsertUser({
          openId: user.openId,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name ?? "",
          expiresInMs: ONE_YEAR_MS,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: ONE_YEAR_MS,
        });

        return { success: true } as const;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * Product and Category Routes
   */
  products: router({
    list: publicProcedure
      .input(
        z.object({
          categoryId: z.number().optional(),
          minPrice: z.number().optional(),
          maxPrice: z.number().optional(),
          sizes: z.array(z.string()).optional(),
          search: z.string().optional(),
        })
      )
      .query(({ input }) =>
        getProducts({
          categoryId: input.categoryId,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          sizes: input.sizes,
          search: input.search,
        })
      ),

    featured: publicProcedure.query(() => getFeaturedProducts()),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => getProductBySlug(input.slug)),

    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getProductById(input.id)),
  }),

  categories: router({
    list: publicProcedure.query(() => getCategories()),
  }),

  /**
   * Shopping Cart Routes
   */
  cart: router({
    list: protectedProcedure.query(({ ctx }) => getCartItems(ctx.user.id)),

    add: protectedProcedure
      .input(
        z.object({
          productId: z.number(),
          quantity: z.number().min(1),
          selectedSize: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await addToCart(ctx.user.id, input.productId, input.quantity, input.selectedSize);
        return getCartItems(ctx.user.id);
      }),

    remove: protectedProcedure
      .input(z.object({ cartItemId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await removeFromCart(input.cartItemId);
        return getCartItems(ctx.user.id);
      }),

    updateQuantity: protectedProcedure
      .input(z.object({ cartItemId: z.number(), quantity: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await updateCartItemQuantity(input.cartItemId, input.quantity);
        return getCartItems(ctx.user.id);
      }),
  }),

  /**
   * Order Routes
   */
  orders: router({
    list: protectedProcedure.query(({ ctx }) => getUserOrders(ctx.user.id)),

    create: protectedProcedure
      .input(
        z.object({
          orderNumber: z.string(),
          subtotal: z.string(),
          shippingCost: z.string(),
          total: z.string(),
          shippingAddress: z.object({
            fullName: z.string(),
            email: z.string(),
            phone: z.string(),
            address: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            country: z.string(),
          }),
          items: z.array(
            z.object({
              productId: z.number(),
              productName: z.string(),
              price: z.string(),
              quantity: z.number(),
              selectedSize: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const orderId = await createOrder(
          ctx.user.id,
          input.orderNumber,
          input.subtotal,
          input.shippingCost,
          input.total,
          input.shippingAddress,
          input.items
        );
        return { orderId };
      }),

    getById: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await getOrderById(input.orderId);
        if (!order || order.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const items = await getOrderItems(input.orderId);
        return { ...order, items };
      }),
  }),

  /**
   * Admin Routes
   */
  admin: router({
    products: router({
      create: adminProcedure
        .input(
          z.object({
            name: z.string(),
            slug: z.string(),
            description: z.string().optional(),
            price: z.string(),
            categoryId: z.number(),
            imageUrl: z.string().optional(),
            galleryImages: z.array(z.string()).optional(),
            sizes: z.array(z.string()),
            stock: z.number(),
            featured: z.number().optional(),
          })
        )
        .mutation(({ input }) => createProduct(input)),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            slug: z.string().optional(),
            description: z.string().optional(),
            price: z.string().optional(),
            categoryId: z.number().optional(),
            imageUrl: z.string().optional(),
            galleryImages: z.array(z.string()).optional(),
            sizes: z.array(z.string()).optional(),
            stock: z.number().optional(),
            featured: z.number().optional(),
          })
        )
        .mutation(({ input }) => {
          const { id, ...data } = input;
          return updateProduct(id, data);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteProduct(input.id)),
    }),

    categories: router({
      create: adminProcedure
        .input(
          z.object({
            name: z.string(),
            slug: z.string(),
            description: z.string().optional(),
          })
        )
        .mutation(({ input }) => createCategory(input)),

      update: adminProcedure
        .input(
          z.object({
            id: z.number(),
            name: z.string().optional(),
            slug: z.string().optional(),
            description: z.string().optional(),
          })
        )
        .mutation(({ input }) => {
          const { id, ...data } = input;
          return updateCategory(id, data);
        }),

      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(({ input }) => deleteCategory(input.id)),
    }),

    orders: router({
      list: adminProcedure.query(() => getAllOrders()),

      updateStatus: adminProcedure
        .input(
          z.object({
            orderId: z.number(),
            status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
          })
        )
        .mutation(({ input }) => updateOrderStatus(input.orderId, input.status)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
