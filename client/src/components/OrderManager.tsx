import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];
const STATUS_LABELS: Record<string, string> = {
  pending: "chờ xử lý",
  processing: "đang xử lý",
  shipped: "đang giao",
  delivered: "đã giao",
  cancelled: "đã hủy",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
  delivered: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

type OrderItem = {
  productName: string;
  quantity: number;
  price: string;
  selectedSize: string;
};

type OrderWithItems = {
  id: number;
  orderNumber: string;
  status: string | null;
  total: string;
  subtotal: string;
  shippingCost: string | null;
  shippingAddress: any;
  items?: OrderItem[];
};

export default function OrderManager() {
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const { data: allOrders = [], refetch } = trpc.admin.orders.list.useQuery();

  const { mutate: updateStatus } = trpc.admin.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật trạng thái đơn hàng thành công");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Không thể cập nhật trạng thái đơn hàng");
    },
  });

  const handleUpdateStatus = (orderId: number, newStatus: string) => {
    updateStatus({
      orderId,
      status: newStatus as any,
    });
  };

  const pendingOrders = allOrders.filter((order: any) => order.status === "pending");
  const processingOrders = allOrders.filter((order: any) => order.status === "processing");
  const shippedOrders = allOrders.filter((order: any) => order.status === "shipped");

  const renderOrderList = (orders: OrderWithItems[], title: string) => (
    <div className="mb-8">
      <h3 className="text-xl font-bold text-foreground mb-4">
        {title} ({orders.length})
      </h3>
      {orders.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          Không có đơn hàng ở trạng thái này
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            (() => {
              const statusKey = order.status ?? "pending";
              return (
            <Card key={order.id} className="p-6">
              <div
                onClick={() =>
                  setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                }
                className="cursor-pointer flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-foreground">#{order.orderNumber}</h4>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        STATUS_COLORS[statusKey] || "bg-gray-100"
                      }`}
                    >
                      {STATUS_LABELS[statusKey] ?? statusKey}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tổng: ${order.total} | {order.items?.length || 0} sản phẩm
                  </p>
                </div>
                <ChevronDown
                  size={20}
                  className={`transition-transform ${
                    expandedOrderId === order.id ? "rotate-180" : ""
                  }`}
                />
              </div>

              {expandedOrderId === order.id && (
                <div className="mt-4 border-t border-border pt-4 space-y-4">
                  {/* Customer Info */}
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">Thông tin khách hàng</h5>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Tên: {order.shippingAddress?.fullName || "N/A"}</p>
                      <p>Email: {order.shippingAddress?.email || "N/A"}</p>
                      <p>Điện thoại: {order.shippingAddress?.phone || "N/A"}</p>
                      <p>Địa chỉ: {order.shippingAddress?.address || "N/A"}</p>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">Sản phẩm ({order.items?.length || 0})</h5>
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start pb-3 border-b border-border last:border-b-0">
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">
                                Size: {item.selectedSize} | SL: {item.quantity}
                              </p>
                            </div>
                            <span className="font-semibold text-accent ml-4">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Đơn hàng không có sản phẩm</p>
                    )}
                  </div>

                  {/* Status Update */}
                  <div>
                    <h5 className="font-semibold text-foreground mb-2">Cập nhật trạng thái</h5>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.filter((s) => s !== statusKey).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleUpdateStatus(order.id, status)}
                          className="px-3 py-1 text-sm capitalize bg-muted text-foreground rounded hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          Chuyển sang {STATUS_LABELS[status] ?? status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
              );
            })()
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 mb-12">
      <div className="flex items-center gap-3">
        <Package size={32} className="text-accent" />
        <h2 className="text-3xl font-bold text-foreground">Quản lý đơn hàng</h2>
      </div>

      {renderOrderList(pendingOrders, "Đơn chờ xử lý")}
      {renderOrderList(processingOrders, "Đơn đang xử lý")}
      {renderOrderList(shippedOrders, "Đơn đang giao")}
    </div>
  );
}
