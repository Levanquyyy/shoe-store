import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Search, X, Filter } from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_SEQUENCE,
  type OrderStatus,
} from "@shared/orderStateMachine";

type SearchParams = {
  orderNumber?: string;
  status?: OrderStatus | "";
};

type OrderItem = {
  productName: string;
  quantity: number;
  price: string;
  selectedSize: string;
};

type OrderResult = {
  id: number;
  orderNumber: string;
  status: string | null;
  total: string;
  subtotal: string;
  shippingCost: string | null;
  shippingAddress?: any;
  items?: OrderItem[];
};

export function OrderSearch() {
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [committedParams, setCommittedParams] = useState<SearchParams | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  // Perform search query
  const { data: searchResults = [], isLoading } = trpc.admin.orders.search.useQuery(
    {
      orderNumber: committedParams?.orderNumber,
      status: (committedParams?.status || undefined) as OrderStatus | undefined,
    },
    {
      enabled: committedParams !== null,
    }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCommittedParams({ ...searchParams });
  };

  const handleOrderNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      orderNumber: e.target.value,
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchParams((prev) => ({
      ...prev,
      status: (e.target.value as OrderStatus | "") || "",
    }));
  };

  const handleClear = () => {
    setSearchParams({});
    setCommittedParams(null);
    setExpandedOrderId(null);
  };

  const orderNumber = searchParams.orderNumber || "";
  const status = searchParams.status || "";

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <Search size={32} className="text-accent" />
        <h2 className="text-3xl font-bold text-foreground">Tìm kiếm đơn hàng</h2>
      </div>

      {/* Search Form */}
      <Card className="p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="orderNumber" className="block text-sm font-semibold text-foreground mb-2">
                Mã đơn hàng
              </label>
              <input
                id="orderNumber"
                type="text"
                placeholder="Tìm mã đơn hàng (ví dụ: ORD-001)"
                value={orderNumber}
                onChange={handleOrderNumberChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-foreground mb-2">
                <span className="flex items-center gap-2">
                  <Filter size={16} />
                  Trạng thái
                </span>
              </label>
              <select
                id="status"
                value={status}
                onChange={handleStatusChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Tất cả trạng thái</option>
                {ORDER_STATUS_SEQUENCE.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABELS[s as OrderStatus]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Search size={18} />
              {isLoading ? "Đang tìm kiếm..." : "Tìm kiếm"}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 px-6 py-2.5 bg-secondary text-secondary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              <X size={18} />
              Xóa
            </button>
          </div>
        </form>
      </Card>

      {/* Search Results */}
      {committedParams !== null && (
        <div>
          {searchResults.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              {isLoading ? "Đang tìm kiếm..." : "Không tìm thấy đơn hàng phù hợp"}
            </Card>
          ) : (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Kết quả tìm kiếm ({searchResults.length})
              </h3>
              {searchResults.map((order) => {
                const currentStatus = (order.status ?? "pending") as OrderStatus;
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
                      <div
                        className={`transition-transform ${
                          expandedOrderId === order.id ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </div>
                    </button>

                    {expandedOrderId === order.id && (
                      <div className="mt-4 border-t border-border pt-4 space-y-4">
                        {/* Customer Info */}
                        {order.shippingAddress && (
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">Thông tin khách hàng</h5>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Tên: {order.shippingAddress.fullName || "N/A"}</p>
                              <p>Email: {order.shippingAddress.email || "N/A"}</p>
                              <p>Điện thoại: {order.shippingAddress.phone || "N/A"}</p>
                              <p>Địa chỉ: {order.shippingAddress.address || "N/A"}</p>
                            </div>
                          </div>
                        )}

                        {/* Order Items */}
                        {order.items && order.items.length > 0 && (
                          <div>
                            <h5 className="font-semibold text-foreground mb-2">
                              Sản phẩm ({order.items.length})
                            </h5>
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
                          </div>
                        )}

                        {/* Order Summary */}
                        <div className="border-t border-border pt-4">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal:</span>
                              <span className="font-semibold">${order.subtotal}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Shipping:</span>
                              <span className="font-semibold">${order.shippingCost || "0.00"}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold">
                              <span>Total:</span>
                              <span className="text-accent">${order.total}</span>
                            </div>
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
      )}
    </div>
  );
}
