import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Cart() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: cartItems, isLoading, refetch: refetchCart } = trpc.cart.list.useQuery();

  const { mutate: removeItem } = trpc.cart.remove.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm khỏi giỏ");
      refetchCart();
    },
    onError: () => {
      toast.error("Không thể xóa sản phẩm");
    },
  });

  const { mutate: updateQuantity } = trpc.cart.updateQuantity.useMutation({
    onSuccess: () => {
      refetchCart();
    },
    onError: () => {
      toast.error("Không thể cập nhật số lượng");
    },
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Đăng nhập để xem giỏ hàng</h1>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/shop">
              <a className="text-foreground hover:text-accent transition-colors">Cửa hàng</a>
            </Link>
            <Link href="/wishlist">
              <a className="text-foreground hover:text-accent transition-colors">Yêu thích</a>
            </Link>
            <Link href="/cart">
              <a className="text-accent font-semibold flex items-center gap-2">
                <ShoppingBag size={20} />
                Giỏ hàng
              </a>
            </Link>
          </div>
        </div>
      </nav>

      <div className="container py-12">
        <div className="mb-8">
          <button
            onClick={() => window.location.href = "/shop"}
            className="flex items-center gap-2 text-accent hover:opacity-80 transition-opacity mb-4"
          >
            <ArrowLeft size={20} />
            Tiếp tục mua sắm
          </button>
          <h1 className="text-4xl font-bold text-foreground">Giỏ hàng</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Đang tải giỏ hàng...</p>
          </div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={64} className="mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Giỏ hàng đang trống</h2>
            <p className="text-muted-foreground mb-6">Thêm vài sản phẩm để bắt đầu nhé!</p>
            <Link href="/shop">
              <a className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                Mua sắm ngay
              </a>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item: any) => (
                <Card key={item.id} className="p-6 flex gap-6">
                  <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    {item.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent/10 to-orange-500/10">
                        <ShoppingBag size={32} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.product?.name}</h3>
                      <p className="text-sm text-muted-foreground">Cỡ: {item.selectedSize}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 border border-border rounded-lg">
                        <button
                          onClick={() =>
                            updateQuantity({
                              cartItemId: item.id,
                              quantity: Math.max(1, item.quantity - 1),
                            })
                          }
                          className="p-1 hover:bg-muted transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="px-3 py-1 text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() =>
                            updateQuantity({
                              cartItemId: item.id,
                              quantity: item.quantity + 1,
                            })
                          }
                          className="p-1 hover:bg-muted transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <span className="text-lg font-bold text-accent">
                        ${(parseFloat(item.product?.price || 0) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem({ cartItemId: item.id })}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                  >
                    <Trash2 size={20} />
                  </button>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24 space-y-4">
                <h2 className="text-xl font-bold text-foreground">Tóm tắt đơn hàng</h2>

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
                  {shippingCost > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Miễn phí vận chuyển cho đơn trên $100
                    </p>
                  )}
                </div>

                <div className="border-t border-border pt-4 flex justify-between text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span className="text-accent">${finalTotal.toFixed(2)}</span>
                </div>

                <Link href="/checkout">
                  <a className="block w-full text-center px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                    Tiến hành thanh toán
                  </a>
                </Link>

                <Link href="/shop">
                  <a className="block w-full text-center px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                    Tiếp tục mua sắm
                  </a>
                </Link>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
