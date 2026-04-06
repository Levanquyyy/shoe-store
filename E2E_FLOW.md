# Tài liệu E2E Flow - FootWare Store

## Tổng quan

Tài liệu này mô tả toàn bộ luồng người dùng từ **đăng ký/đăng nhập** cho đến **mua hàng** trong dự án FootWare Store.

---

## 1️⃣ GIAI ĐOẠN: ĐĂNG KÝ / ĐĂNG NHẬP

### 1.1 Frontend - Trang Login
**File:** `client/src/pages/Login.tsx`

#### Chức năng:
- Cho phép người dùng chuyển đổi giữa 2 chế độ: **Đăng nhập** / **Đăng ký**
- Thu thập thông tin form (email, mật khẩu, tên - nếu đăng ký)
- Gọi API để xác thực

#### Key Components:
```typescript
// State form
const [mode, setMode] = useState<"login" | "register">("login");
const [formData, setFormData] = useState({
  name: "",        // ✅ Đăng ký
  email: "",       // ✅ Cả 2
  password: "",    // ✅ Cả 2
  confirmPassword: "" // ✅ Đăng ký
});

// 2 mutation: login & register
const loginMutation = trpc.auth.login.useMutation({...});
const registerMutation = trpc.auth.register.useMutation({...});
```

#### User Actions:
1. Nhập email + mật khẩu (đăng nhập) hoặc email + tên + mật khẩu (đăng ký)
2. Click nút "Đăng nhập" / "Đăng ký"
3. Form gửi request tới server qua tRPC

#### After Success:
```typescript
// onSuccess callback
toast.success("Đăng nhập/ký thành công");
await utils.auth.me.invalidate(); // Clear cache
setTimeout(() => {
  window.location.href = "/?t=" + Date.now(); // Redirect về home + cache-busting
}, 600);
```

---

### 1.2 Server - Router Xác thực
**File:** `server/routers.ts` (dòng 52-137)

#### Endpoint 1: `auth.register` (publicProcedure)
```typescript
register: publicProcedure
  .input(
    z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8)
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Validate: email đã tồn tại?
    const existingUser = await getUserByEmail(email);
    if (existingUser) throw "Email đã được sử dụng";

    // 2. Tạo user mới
    const openId = `local:${email}`;
    await upsertUser({
      openId,
      name: input.name,
      email,
      passwordHash: hashPassword(input.password), // ✅ Hash mật khẩu
      loginMethod: "manual",
      lastSignedIn: new Date()
    });

    // 3. Tạo session token (1 năm)
    const sessionToken = await sdk.createSessionToken(openId, {
      name: input.name,
      expiresInMs: ONE_YEAR_MS
    });

    // 4. Set cookie
    ctx.res.cookie(COOKIE_NAME, sessionToken, {
      maxAge: ONE_YEAR_MS
    });

    return { success: true };
  });
```

**Database call:** `db.upsertUser()`

#### Endpoint 2: `auth.login` (publicProcedure)
```typescript
login: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    // 1. Tìm user by email
    const user = await getUserByEmail(email);

    // 2. Verify password
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw "Email hoặc mật khẩu không đúng";
    }

    // 3. Update lastSignedIn
    await upsertUser({
      openId: user.openId,
      lastSignedIn: new Date()
    });

    // 4. Tạo session token
    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name,
      expiresInMs: ONE_YEAR_MS
    });

    // 5. Set cookie
    ctx.res.cookie(COOKIE_NAME, sessionToken, {
      maxAge: ONE_YEAR_MS
    });

    return { success: true };
  });
```

#### Endpoint 3: `auth.logout` (publicProcedure)
```typescript
logout: publicProcedure.mutation(({ ctx }) => {
  // Xóa cookie
  ctx.res.clearCookie(COOKIE_NAME, { maxAge: -1 });
  return { success: true };
});
```

#### Endpoint 4: `auth.me` (publicProcedure)
```typescript
me: publicProcedure.query((opts) => opts.ctx.user);
// Trả về thông tin user hiện tại (hoặc null nếu chưa login)
```

---

### 1.3 Server - Xác thực & Authorization
**File:** `server/_core/trpc.ts`

```typescript
// publicProcedure: Không cần xác thực
export const publicProcedure = t.procedure;

// protectedProcedure: Yêu cầu user đã login
export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user || !ctx.user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});
```

**User Context:** Được lấy từ cookie session token + database

---

### 1.4 Client Hook - Kiểm tra trạng thái đăng nhập
**File:** `client/src/_core/hooks/useAuth.ts`

```typescript
export function useAuth() {
  const { data: user } = trpc.auth.me.useQuery();

  return {
    user,
    isAuthenticated: !!user?.id,
    isAdmin: user?.role === "admin"
  };
}
```

Được sử dụng trong:
- `Login.tsx`: Redirect nếu đã login
- `Cart.tsx`, `Checkout.tsx`: Kiểm tra authenticated trước khi xem
- App router: Protected routes

---

## 2️⃣ GIAI ĐOẠN: DUYỆT SẢN PHẨM

### 2.1 Frontend - Trang Shop
**File:** `client/src/pages/Shop.tsx`

#### Chức năng:
- Lấy danh sách sản phẩm (có filter)
- Hiển thị grid sản phẩm
- Có nút "Thêm vào giỏ hàng"

#### API Call:
```typescript
const { data: products } = trpc.products.list.useQuery({
  categoryId: selectedCategory,
  minPrice: minPrice,
  maxPrice: maxPrice,
  sizes: selectedSizes,
  search: searchTerm
});
```

---

### 2.2 Frontend - Trang Chi tiết sản phẩm
**File:** `client/src/pages/ProductDetail.tsx`

#### URL:** `/product/:slug`

#### Chức năng:
- Hiển thị ảnh, mô tả, giá, sizes
- Nút "Thêm vào giỏ hàng" (yêu cầu chọn size + số lượng)

#### API Call:
```typescript
const { data: product } = trpc.products.bySlug.useQuery({ slug });
```

---

### 2.3 Server - Product Endpoints
**File:** `server/routers.ts` (dòng 142-176)

#### Endpoints:
```typescript
products: router({
  list: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      sizes: z.array(z.string()).optional(),
      search: z.string().optional()
    }))
    .query(({ input }) => getProducts({...})),

  featured: publicProcedure.query(() => getFeaturedProducts()),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => getProductBySlug(input.slug)),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id))
});
```

---

## 3️⃣ GIAI ĐOẠN: QUẢN LÝ GIỎ HÀNG

### 3.1 Frontend - Trang Cart
**File:** `client/src/pages/Cart.tsx`

#### URL:** `/cart`

#### Chức năng:
- Hiển thị danh sách sản phẩm trong giỏ
- Nút `+` / `-` để thay đổi số lượng
- Nút xóa sản phẩm
- Tính tổng tiền + phí vận chuyển
- Nút "Tiến hành thanh toán"

#### API Calls:
```typescript
// Lấy giỏ hàng (protected)
const { data: cartItems } = trpc.cart.list.useQuery();

// Xóa sản phẩm khỏi giỏ
const { mutate: removeItem } = trpc.cart.remove.useMutation({
  onSuccess: () => refetchCart()
});

// Cập nhật số lượng
const { mutate: updateQuantity } = trpc.cart.updateQuantity.useMutation({
  onSuccess: () => refetchCart()
});
```

#### Logic:
```typescript
const total = cartItems?.reduce((sum, item) => {
  const price = parseFloat(item.product?.price || 0);
  return sum + price * item.quantity;
}, 0) || 0;

const shippingCost = total > 100 ? 0 : 10; // Miễn phí vận chuyển nếu >$100
const finalTotal = total + shippingCost;
```

---

### 3.2 Server - Cart Endpoints
**File:** `server/routers.ts` (dòng 181-210)

#### Endpoints:
```typescript
cart: router({
  // Lấy danh sách giỏ hàng (protected)
  list: protectedProcedure.query(({ ctx }) =>
    getCartItems(ctx.user.id)
  ),

  // Thêm vào giỏ
  add: protectedProcedure
    .input(z.object({
      productId: z.number(),
      quantity: z.number().min(1),
      selectedSize: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await addToCart(
        ctx.user.id,
        input.productId,
        input.quantity,
        input.selectedSize
      );
      return getCartItems(ctx.user.id);
    }),

  // Xóa từ giỏ
  remove: protectedProcedure
    .input(z.object({ cartItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await removeFromCart(input.cartItemId);
      return getCartItems(ctx.user.id);
    }),

  // Cập nhật số lượng
  updateQuantity: protectedProcedure
    .input(z.object({
      cartItemId: z.number(),
      quantity: z.number().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      await updateCartItemQuantity(input.cartItemId, input.quantity);
      return getCartItems(ctx.user.id);
    })
});
```

---

## 4️⃣ GIAI ĐOẠN: THANH TOÁN (CHECKOUT)

### 4.1 Frontend - Trang Checkout
**File:** `client/src/pages/Checkout.tsx`

#### URL:** `/checkout`

#### Chức năng:
- Hiển thị danh sách sản phẩm (read-only)
- Form nhập thông tin giao hàng
- Hiển thị tổng tiền
- Nút "Đặt hàng"

#### Form Fields:
```typescript
{
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: ""
}
```

#### Protection:
```typescript
const { isAuthenticated } = useAuth();
if (!isAuthenticated) {
  return <div>Đăng nhập để thanh toán</div>;
}
```

#### API Call:
```typescript
const { mutate: createOrder } = trpc.orders.create.useMutation({
  onSuccess: (result) => {
    toast.success("Đặt hàng thành công!");
    // Redirect tới trang xác nhận
    setLocation(`/order-confirmation?orderId=${result.orderId}`);
  }
});
```

#### Trigger:
```typescript
const handleSubmit = (e) => {
  e.preventDefault();
  const orderNumber = `ORD-${Date.now()}`;

  createOrder({
    orderNumber,
    subtotal: total.toFixed(2),
    shippingCost: shippingCost.toFixed(2),
    total: finalTotal.toFixed(2),
    shippingAddress: formData,
    items: cartItems.map(item => ({
      productId: item.productId,
      productName: item.product?.name,
      price: item.product?.price,
      quantity: item.quantity,
      selectedSize: item.selectedSize
    }))
  });
};
```

---

### 4.2 Server - Order Creation
**File:** `server/routers.ts` (dòng 215-269)

#### Endpoint: `orders.create` (protectedProcedure)
```typescript
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
        country: z.string()
      }),
      items: z.array(
        z.object({
          productId: z.number(),
          productName: z.string(),
          price: z.string(),
          quantity: z.number(),
          selectedSize: z.string()
        })
      )
    })
  )
  .mutation(async ({ ctx, input }) => {
    // Tạo đơn hàng trong database
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
  });
```

#### Database Operations:
```typescript
// Tạo record Order
await db.order.create({
  userId: ctx.user.id,
  orderNumber: input.orderNumber,
  subtotal: input.subtotal,
  shippingCost: input.shippingCost,
  total: input.total,
  status: "pending", // ✅ Mặc định = pending
  shippingAddress: JSON.stringify(input.shippingAddress),
  createdAt: new Date()
});

// Tạo OrderItem cho mỗi sản phẩm
input.items.forEach(item => {
  await db.orderItem.create({
    orderId: orderId,
    productId: item.productId,
    productName: item.productName,
    price: item.price,
    quantity: item.quantity,
    selectedSize: item.selectedSize
  });
});
```

#### Business Rules:
- **Status Immutability:** Sau khi thay đổi lần đầu từ "pending", không thể thay đổi lại
  - File: `server/order-status-immutability.test.ts`
  - Implementation: `routers.ts` line 367-373

---

## 5️⃣ GIAI ĐOẠN: XÁC NHẬN ĐƠN HÀNG

### 5.1 Frontend - Trang Order Confirmation
**File:** `client/src/pages/OrderConfirmation.tsx`

#### URL:** `/order-confirmation?orderId={id}`

#### Chức năng:
- Hiển thị "✅ Đơn hàng đã được ghi nhận!"
- Chi tiết đơn hàng (giỏ hàng, địa chỉ giao hàng, tổng tiền)
- Nút "In hóa đơn"
- Nút "Về trang chủ"

#### Lấy Order ID:
```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("orderId");
  if (id) setOrderId(parseInt(id));
}, []);
```

#### API Call:
```typescript
const { data: order } = trpc.orders.getById.useQuery(
  { orderId: orderId || 0 },
  { enabled: !!orderId }
);
```

#### Hiển thị:
- Mã đơn hàng
- Danh sách sản phẩm
- Giá từng sản phẩm × số lượng
- Tổng cộng + phí vận chuyển
- Địa chỉ giao hàng
- Trạng thái đơn hàng: "Chờ xử lý" | "Đang xử lý" | "Đang giao" | "Đã giao" | "Đã hủy"

#### In hóa đơn:
```typescript
const handlePrint = () => {
  window.print();
};
```

---

### 5.2 Server - Get Order Details
**File:** `server/routers.ts` (dòng 259-268)

#### Endpoint: `orders.getById` (protectedProcedure)
```typescript
getById: protectedProcedure
  .input(z.object({ orderId: z.number() }))
  .query(async ({ ctx, input }) => {
    const order = await getOrderById(input.orderId);

    // ✅ Authorization: User chỉ có thể xem order của chính mình
    if (!order || order.userId !== ctx.user.id) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    // Lấy danh sách item
    const items = await getOrderItems(input.orderId);

    return { ...order, items };
  });
```

---

## 6️⃣ GIAI ĐOẠN: QUẢN LÝ ĐƠN HÀNG (ADMIN)

### 6.1 Frontend - Admin Dashboard
**File:** `client/src/pages/Admin.tsx`

#### Chức năng:
- Quản lý sản phẩm (CRUD)
- Quản lý danh mục (CRUD)
- Quản lý đơn hàng (xem danh sách, thay đổi trạng thái)

---

### 6.2 Server - Admin Routes
**File:** `server/routers.ts` (dòng 274-384)

#### Admin Protection:
```typescript
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

#### Admin Order Routes:
```typescript
admin: router({
  orders: router({
    // Lấy tất cả đơn hàng
    list: adminProcedure.query(() => getAllOrders()),

    // Thay đổi trạng thái đơn hàng
    updateStatus: adminProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum([
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
          ])
        })
      )
      .mutation(async ({ input }) => {
        const existing = await getOrderById(input.orderId);

        // ✅ Order status immutable check
        if (existing.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Order status is immutable after first change"
          });
        }

        const updated = await updateOrderStatus(
          input.orderId,
          input.status
        );

        return updated;
      })
  })
});
```

---

## 7️⃣ TÍNH NĂNG BONUS: PRODUCT CONSULTATION

### 7.1 Frontend - Tư vấn sản phẩm
**File:**
- `client/src/components/ConsultationButton.tsx` - Nút "Tư vấn"
- `client/src/components/ConsultationModal.tsx` - Modal tư vấn
- `client/src/pages/Consultations.tsx` - Danh sách tư vấn của user

#### Chức năng:
- Người dùng tạo yêu cầu tư vấn cho sản phẩm
- Chat với admin để giải đáp thắc mắc
- Đóng yêu cầu tư vấn

---

### 7.2 Server - Consultation Endpoints
**File:** `server/routers.ts` (dòng 387-508)

```typescript
consultation: router({
  // Tạo yêu cầu tư vấn
  create: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const consultation = await createConsultation(
        input.productId,
        ctx.user.id
      );
      return consultation;
    }),

  // Lấy danh sách tư vấn của user
  getMyConsultations: protectedProcedure.query(async ({ ctx }) => {
    return getConsultationsByUser(ctx.user.id);
  }),

  // Lấy tin nhắn trong tư vấn
  getMessages: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const consultation = await getConsultationById(input.consultationId);

      // ✅ Authorization: Only owner or admin
      if (!canAccessConsultation(consultation, ctx.user)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return getConsultationMessages(input.consultationId);
    }),

  // Gửi tin nhắn
  sendMessage: protectedProcedure
    .input(
      z.object({
        consultationId: z.number(),
        message: z.string()
          .min(1, "Message cannot be empty")
          .max(2000, "Message must be 2000 characters or fewer")
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validation & Authorization checks
      return addConsultationMessage(
        input.consultationId,
        ctx.user.id,
        input.message
      );
    }),

  // Đóng yêu cầu tư vấn
  close: protectedProcedure
    .input(z.object({ consultationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return closeConsultation(input.consultationId);
    })
});
```

---

## 📊 TỔNG HỢP LUỒNG DỮ LIỆU

```
┌─────────────────────────────────────────────────────────────┐
│                   USER JOURNEY MAP                          │
└─────────────────────────────────────────────────────────────┘

1. ĐĂNG KÝ/ĐĂNG NHẬP
   Login.tsx
   ├─ registerMutation → auth.register (server)
   │  └─ getUserByEmail + upsertUser + createSessionToken
   └─ loginMutation → auth.login (server)
      └─ getUserByEmail + verifyPassword + updateLastSignedIn

2. DUYỆT SẢN PHẨM
   Shop.tsx / ProductDetail.tsx
   ├─ products.list (filter)
   └─ products.bySlug

3. THÊM VÀO GIỎ
   ProductDetail.tsx
   └─ cart.add → server
      └─ addToCart(userId, productId, quantity, size)

4. QUẢN LÝ GIỎ
   Cart.tsx
   ├─ cart.list → getCartItems(userId)
   ├─ cart.remove → removeFromCart(cartItemId)
   └─ cart.updateQuantity → updateCartItemQuantity(cartItemId, qty)

5. THANH TOÁN
   Checkout.tsx
   ├─ Form: fullName, email, phone, address, city, state, zip, country
   └─ orders.create → server
      └─ createOrder(userId, orderNumber, address, items)
         └─ [Tạo Order record + OrderItem records]

6. XÁC NHẬN ĐƠN HÀNG
   OrderConfirmation.tsx
   └─ orders.getById → server
      └─ getOrderById + getOrderItems

7. ADMIN QUẢN LÝ
   Admin.tsx
   └─ admin.orders.list / admin.orders.updateStatus

8. TƯ VẤN SẢN PHẨM
   Consultations.tsx / ConsultationModal.tsx
   ├─ consultation.create
   ├─ consultation.getMyConsultations
   ├─ consultation.getMessages
   ├─ consultation.sendMessage
   └─ consultation.close
```

---

## 🔐 SECURITY CHECKPOINT

| Giai đoạn | Authorization | Validation |
|-----------|---------------|------------|
| Đăng ký/Nhập | public | Email/mật khẩu rules |
| Duyệt sản phẩm | public | - |
| Thêm giỏ | protected (login required) | productId, quantity, size |
| Xem giỏ | protected | userId match |
| Checkout | protected | Shipping address fields |
| Order creation | protected | Cart items, shipping info |
| Order detail | protected | userId == order.userId |
| Admin routes | protected + admin role check | - |
| Consultation | protected | consultationId ownership |

---

## 🧪 TESTING COVERAGE

### Unit Tests:
- `server/ecommerce.test.ts` - Cart, order logic
- `server/order-status-immutability.test.ts` - Order status validation
- `server/category-filter.test.ts` - Product filtering
- `client/src/components/__tests__/consultation.test.tsx` - Consultation UI

### E2E Tests:
- TBD - Playwright tests for full user journeys

---

## 📁 FILE STRUCTURE REFERENCE

```
client/src/
├── pages/
│   ├── Login.tsx           # ← Đăng ký/Đăng nhập
│   ├── Shop.tsx            # ← Duyệt sản phẩm
│   ├── ProductDetail.tsx   # ← Chi tiết + thêm giỏ
│   ├── Cart.tsx            # ← Quản lý giỏ hàng
│   ├── Checkout.tsx        # ← Thanh toán
│   ├── OrderConfirmation.tsx # ← Xác nhận đơn
│   ├── Admin.tsx           # ← Admin dashboard
│   ├── Account.tsx         # ← Tài khoản user
│   ├── Consultations.tsx   # ← Danh sách tư vấn
│   └── ...
├── _core/hooks/
│   └── useAuth.ts          # ← Authentication hook
└── lib/
    └── trpc.ts             # ← tRPC client

server/
├── routers.ts              # ← Tất cả API endpoints
├── db.ts                   # ← Database queries
├── _core/
│   ├── trpc.ts             # ← tRPC setup + procedures
│   ├── password.ts         # ← Hash/verify password
│   ├── cookies.ts          # ← Cookie management
│   └── ...
└── *.test.ts               # ← Server tests
```

---

## 🎯 KEY TAKEAWAYS

1. **Flow chính:** Login → Browse → Add to Cart → Checkout → Order Confirmation
2. **Protected routes:** Cart, Checkout, Account, Consultations (require login)
3. **Admin routes:** Product/Category CRUD, Order status updates (require admin role)
4. **Order immutability:** Status chỉ có thể thay đổi 1 lần từ "pending" sang status khác
5. **Security:** Sử dụng tRPC protectedProcedure + userId checks + role checks
6. **Session:** Lưu trong cookies, 1 năm expiry
