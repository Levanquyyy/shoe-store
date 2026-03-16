import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: cartItems } = trpc.cart.list.useQuery();
  const { mutate: createOrder, isPending } = trpc.orders.create.useMutation({
    onSuccess: (result) => {
      toast.success("Đặt hàng thành công!");
      setTimeout(() => setLocation(`/order-confirmation?orderId=${result.orderId}`), 1500);
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể đặt hàng");
    },
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border">
          <div className="container flex items-center h-16">
            <Link href="/">
              <a className="text-2xl font-bold text-accent">FootWare</a>
            </Link>
          </div>
        </nav>
        <div className="container py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Đăng nhập để thanh toán</h1>
          <Link href="/">
            <a className="text-accent hover:opacity-80">Về trang chủ</a>
          </Link>
        </div>
      </div>
    );
  }

  const total = cartItems?.reduce((sum, item: any) => {
    const price = parseFloat(item.product?.price || 0);
    return sum + price * item.quantity;
  }, 0) || 0;

  const shippingCost = total > 100 ? 0 : 10;
  const finalTotal = total + shippingCost;

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();

    if (!cartItems || cartItems.length === 0) {
      toast.error("Giỏ hàng đang trống");
      return;
    }

    const orderNumber = `ORD-${Date.now()}`;
    createOrder({
      orderNumber,
      subtotal: total.toFixed(2),
      shippingCost: shippingCost.toFixed(2),
      total: finalTotal.toFixed(2),
      shippingAddress: formData,
      items: cartItems.map((item: any) => ({
        productId: item.productId,
        productName: item.product?.name || "",
        price: item.product?.price || "0",
        quantity: item.quantity,
        selectedSize: item.selectedSize,
      })),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <Link href="/cart">
            <a className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
              <ShoppingBag size={20} />
              Giỏ hàng
            </a>
          </Link>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <Link href="/cart">
            <a className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity mb-4">
              <ArrowLeft size={20} />
              Quay lại giỏ hàng
            </a>
          </Link>
          <h1 className="text-4xl font-bold text-foreground">Thanh toán</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-6">Thông tin giao hàng</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Họ và tên</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Số điện thoại</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Quốc gia</label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Thành phố</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Tỉnh/Thành</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-2">Mã bưu điện</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? "Đang xử lý..." : "Đặt hàng"}
                </button>
              </form>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24 space-y-4">
              <h2 className="text-xl font-bold text-foreground">Tóm tắt đơn hàng</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto border-t border-border pt-4">
                {cartItems?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium text-foreground">{item.product?.name}</p>
                      <p className="text-xs text-muted-foreground">Cỡ: {item.selectedSize} x {item.quantity}</p>
                    </div>
                    <p className="font-semibold text-accent">
                      ${(parseFloat(item.product?.price || 0) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tạm tính</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Vận chuyển</span>
                  <span className={shippingCost === 0 ? "text-green-600 font-semibold" : ""}>
                    {shippingCost === 0 ? "MIỄN PHÍ" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                <span>Tổng cộng</span>
                <span className="text-accent">${finalTotal.toFixed(2)}</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
