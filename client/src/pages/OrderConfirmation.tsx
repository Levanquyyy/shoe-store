import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { CheckCircle, Printer, Home } from "lucide-react";
import { toast } from "sonner";

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
          <p className="text-muted-foreground mb-6">Loading order details...</p>
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground mb-6">
              Thank you for your purchase. Your order has been received and is pending admin approval.
            </p>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <Printer size={20} />
              Print Invoice
            </button>
          </div>

          {/* Invoice */}
          <Card className="p-8 print:border-0 print:shadow-none">
            {/* Header */}
            <div className="mb-8 pb-8 border-b border-border">
              <h2 className="text-3xl font-bold text-foreground mb-2">INVOICE</h2>
              <p className="text-muted-foreground">Order #{order.orderNumber}</p>
            </div>

            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-foreground mb-4">BILL TO</h3>
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
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Status</p>
                  <p className={`text-lg font-semibold ${
                    order.status === "pending" ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : "Pending"}
                  </p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 font-semibold text-foreground">Product</th>
                    <th className="text-center py-2 font-semibold text-foreground">Size</th>
                    <th className="text-center py-2 font-semibold text-foreground">Qty</th>
                    <th className="text-right py-2 font-semibold text-foreground">Price</th>
                    <th className="text-right py-2 font-semibold text-foreground">Total</th>
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
                  <span className="text-foreground">Subtotal</span>
                  <span className="text-foreground">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border mb-4">
                  <span className="text-foreground">Shipping</span>
                  <span className={shippingCost === 0 ? "text-green-600 font-semibold" : "text-foreground"}>
                    {shippingCost === 0 ? "FREE" : `$${shippingCost.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="text-accent">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
              <p>Thank you for your purchase!</p>
              <p>Your order is pending admin approval. You will receive a confirmation email once it's approved.</p>
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-8 flex gap-4 justify-center print:hidden">
            <Link href="/account">
              <a className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                View Orders
              </a>
            </Link>
            <Link href="/shop">
              <a className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity">
                <Home size={20} />
                Continue Shopping
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
