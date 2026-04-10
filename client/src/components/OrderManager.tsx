import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Package, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { OrderSearch } from "./OrderSearch";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_SEQUENCE,
  getNextStatus,
  type OrderStatus,
} from "@shared/orderStateMachine";

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

  const handleAdvanceStatus = (orderId: number, currentStatus: OrderStatus) => {
    const next = getNextStatus(currentStatus);
    if (!next) return;
    updateStatus({ orderId, status: next as any });
  };

  const handleCancel = (orderId: number) => {
    updateStatus({ orderId, status: "cancelled" as any });
  };

  const groupedOrders = ORDER_STATUS_SEQUENCE.reduce(
    (acc, status) => {
      acc[status] = allOrders.filter((o: any) => o.status === status);
      return acc;
    },
    {} as Record<OrderStatus, OrderWithItems[]>
  );

  const cancelledOrders = allOrders.filter((o: any) => o.status === "cancelled");

  const renderOrderList = (orders: OrderWithItems[], title: string, statusKey: OrderStatus) => (
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
          {orders.map((order) => {
            const currentStatus = (order.status ?? "pending") as OrderStatus;
            const nextStatus = getNextStatus(currentStatus);
            const canCancel = currentStatus === "pending" || currentStatus === "processing";

            return (
              <Card key={order.id} className="p-6">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedOrderId(expandedOrderId === order.id ? null : order.id)
                  }
                  aria-expanded={expandedOrderId === order.id}
                  className="w-full cursor-pointer flex items-center justify-between text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground">#{order.orderNumber}</h4>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          ORDER_STATUS_COLORS[currentStatus] || "bg-gray-100"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[currentStatus] ?? currentStatus}
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
                    aria-hidden="true"
                  />
                </button>

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
                      <h5 className="font-semibold text-foreground mb-2">
                        Sản phẩm ({order.items?.length || 0})
                      </h5>
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-3">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-start pb-3 border-b border-border last:border-b-0"
                            >
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

                    {/* Status Actions – state machine: only show NEXT step */}
                    <div>
                      <h5 className="font-semibold text-foreground mb-2">Cập nhật trạng thái</h5>
                      <div className="flex gap-2 flex-wrap items-center">
                        {nextStatus ? (
                          <button
                            onClick={() => handleAdvanceStatus(order.id, currentStatus)}
                            className="px-4 py-2 text-sm font-semibold bg-accent text-accent-foreground rounded-lg hover:opacity-90 transition-opacity"
                          >
                            Chuyển sang: {ORDER_STATUS_LABELS[nextStatus]}
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Trạng thái cuối – không thể thay đổi
                          </span>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="px-4 py-2 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity"
                          >
                            Hủy đơn hàng
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
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

      {/* Order Search Component */}
      <OrderSearch />

      {/* Order List by Status */}
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-6">Đơn hàng theo trạng thái</h3>

      {renderOrderList(groupedOrders["pending"], "Đơn chờ xử lý", "pending")}
      {renderOrderList(groupedOrders["processing"], "Đơn đang xử lý", "processing")}
      {renderOrderList(groupedOrders["shipped"], "Đơn đang giao", "shipped")}
      {renderOrderList(groupedOrders["delivered"], "Đơn đã giao", "delivered")}

      {cancelledOrders.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-4">
            Đơn đã hủy ({cancelledOrders.length})
          </h3>
          <div className="space-y-3">
            {cancelledOrders.map((order: any) => (
              <Card key={order.id} className="p-4 opacity-60">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-foreground">#{order.orderNumber}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_COLORS.cancelled}`}>
                    {ORDER_STATUS_LABELS.cancelled}
                  </span>
                  <p className="text-sm text-muted-foreground">Tổng: ${order.total}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
