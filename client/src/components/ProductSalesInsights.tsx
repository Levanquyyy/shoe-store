import { useEffect, useState } from "react";
import { Search, Filter, TrendingDown, CircleSlash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/Pagination";

export type ProductSalesInsightItem = {
  productId: number;
  productName: string;
  price: string;
  stock: number;
  quantitySold: number;
  revenue: string;
};

type SalesFilter = "all" | "best" | "slow" | "unsold";

interface ProductSalesInsightsProps {
  items: ProductSalesInsightItem[];
}

const PAGE_SIZE = 5;
const BEST_SELLING_THRESHOLD = 5;
const SLOW_MOVING_THRESHOLD = 2;

const FILTER_LABELS: Record<SalesFilter, string> = {
  all: "Tất cả",
  best: "Bán chạy",
  slow: "Bán ế",
  unsold: "Chưa bán",
};

export function ProductSalesInsights({ items }: ProductSalesInsightsProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SalesFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filter, items.length]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    const matchesQuery = normalizedQuery
      ? item.productName.toLowerCase().includes(normalizedQuery)
      : true;

    if (!matchesQuery) return false;

    if (filter === "best") return item.quantitySold >= BEST_SELLING_THRESHOLD;
    if (filter === "slow") return item.quantitySold > 0 && item.quantitySold <= SLOW_MOVING_THRESHOLD;
    if (filter === "unsold") return item.quantitySold === 0;

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const zeroSalesCount = items.filter((item) => item.quantitySold === 0).length;

  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Top sản phẩm bán chạy</h2>
          <p className="text-sm text-muted-foreground">
            Tìm kiếm, phân trang và lọc cả hàng bán ế / chưa bán.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {zeroSalesCount} sản phẩm chưa có đơn bán ra
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] mb-5">
        <label className="relative block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm sản phẩm..."
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-accent"
          />
        </label>

        <label className="relative block">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as SalesFilter)}
            className="w-full appearance-none rounded-lg border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors focus:border-accent"
          >
            {Object.entries(FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as SalesFilter[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === value
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {FILTER_LABELS[value]}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
          <CircleSlash2 size={32} className="mx-auto mb-3" />
          Không tìm thấy sản phẩm phù hợp.
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((product) => {
            const isUnsold = product.quantitySold === 0;
            const isSlowMoving = product.quantitySold > 0 && product.quantitySold <= SLOW_MOVING_THRESHOLD;

            return (
              <div
                key={product.productId}
                className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{product.productName}</p>
                    {isUnsold ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                        Chưa bán
                      </span>
                    ) : isSlowMoving ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                        Bán ế
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Bán chạy
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Đã bán {product.quantitySold} · Doanh thu ${Number.parseFloat(product.revenue).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} · Tồn kho {product.stock}
                  </p>
                </div>

                <div className="text-sm font-semibold text-foreground">
                  {product.quantitySold >= BEST_SELLING_THRESHOLD ? "Top bán chạy" : FILTER_LABELS[filter]}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredItems.length > PAGE_SIZE && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          hasNextPage={safePage < totalPages}
          hasPreviousPage={safePage > 1}
          onPageChange={(page) => setCurrentPage(page)}
          onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
          onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
          totalItems={filteredItems.length}
          pageSize={PAGE_SIZE}
          ariaLabel="Phân trang top sản phẩm bán chạy"
        />
      )}
    </Card>
  );
}