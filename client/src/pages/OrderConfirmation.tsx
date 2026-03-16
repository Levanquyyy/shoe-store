import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { CheckCircle, Printer, Home } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};

export default function OrderConfirmation() {
  const [location] = useLocation();
  const [orderId, setOrderId] = useState<number | null>(null);
  const { data: order } = trpc.orders.getById.useQuery(
    { orderId: orderId || 0 },
    { enabled: !!orderId }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("orderId");
    if (id) {
      setOrderId(parseInt(id));
    }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!orderId || !order) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="bg-card border-b border-border sticky top-0 z-40">
          <div className="container flex items-center justify-between h-16">
            <Link href="/">
              <a className="text-2xl font-bold text-accent">FootWare</a>
            </Link>
          </div>
        </nav>
        <div className="container py-12 text-center">
          <p className="text-muted-foreground mb-6">Đang tải chi tiết đơn hàng...</p>
        </div>
      </div>
    );
  }

  const subtotal = parseFloat(order.subtotal?.toString() || "0");
  const shippingCost = parseFloat(order.shippingCost?.toString() || "0");
  const total = parseFloat(order.total?.toString() || "0");

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card border-b border-border sticky top-0 z-40 print:hidden">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <a className="text-2xl font-bold text-accent">FootWare</a>
          </Link>
        </div>
      </nav>

      <div className="container py-12 print:py-0">
        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className="mb-8 text-center print:hidden">
            <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
            <h1 className="text-4xl font-bold text-foreground mb-2">Đơn hàng đã được ghi nhận!</h1>
            <p className="text-muted-foreground mb-6">
              Cảm ơn bạn đã mua hàng. Đơn hàng đã được tiếp nhận và đang chờ quản trị viên duyệt.
            </p>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Printer size={20} />
              In hóa đơn
            </button>
          </div>

          {/* Invoice */}
          <Card className="p-8 print:border-0 print:shadow-none">
            {/* Header */}
            <div className="mb-8 pb-8 border-b border-border">
              <h2 className="text-3xl font-bold text-foreground mb-2">HÓA ĐƠN</h2>
              <p className="text-muted-foreground">Đơn #{order.orderNumber}</p>
            </div>

            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4">THÔNG TIN NHẬN HÀNG</h3>
                <div className="text-sm text-foreground space-y-1">
                  <p className="font-semibold">{order.shippingAddress.fullName}</p>
                  <p>{order.shippingAddress.address}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  <p className="mt-2">{order.shippingAddress.email}</p>
                  <p>{order.shippingAddress.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Ngày đặt</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trạng thái</p>
                  <p className={`text-lg font-semibold ${
                    order.status === "pending" ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {STATUS_LABELS[order.status ?? "pending"] ?? order.status ?? "Chờ xử lý"}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-semibold text-foreground">Sản phẩm</th>
                    <th className="text-center py-2 font-semibold text-foreground">Cỡ</th>
                    <th className="text-center py-2 font-semibold text-foreground">SL</th>
                    <th className="text-right py-2 font-semibold text-foreground">Đơn giá</th>
                    <th className="text-right py-2 font-semibold text-foreground">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item: any) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="py-3 text-foreground">{item.productName}</td>
                      <td className="text-center py-3 text-foreground">{item.selectedSize}</td>
                      <td className="text-center py-3 text-foreground">{item.quantity}</td>
                      <td className="text-right py-3 text-foreground">${parseFloat(item.price).toFixed(2)}</td>
                      <td className="text-right py-3 text-foreground font-semibold">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full md:w-64">
                <div className="flex justify-between py-2 border-b border-border mb-2">
                  <span className="text-foreground">Tạm tính</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border mb-4">
                  <span className="text-foreground">Vận chuyển</span>
                  <span className={shippingCost === 0 ? "text-green-600 font-semibold" : "text-foreground"}>
                    {shippingCost === 0 ? "MIỄN PHÍ" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span className="text-foreground">Tổng cộng</span>
                  <span className="text-accent">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
              <p>Cảm ơn bạn đã mua hàng!</p>
              <p>Đơn hàng đang chờ duyệt. Bạn sẽ nhận thông báo sau khi đơn được xác nhận.</p>
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-8 flex gap-4 justify-center print:hidden">
            <Link href="/account">
              <a className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                Xem đơn hàng
              </a>
            </Link>
            <Link href="/shop">
              <a className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                <Home size={20} />
                Tiếp tục mua sắm
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
