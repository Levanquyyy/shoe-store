import React from "react";
import { Edit2, Trash2, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Ngưỡng tồn kho thấp
const LOW_STOCK_THRESHOLD = 10;

export interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  imageUrl?: string | null;
  description?: string;
}

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
}

// ── Thumbnail ───────────────────────────────────────────────────────────────

function ProductThumbnail({ product }: { product: Product }) {
  if (product.imageUrl) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        className="h-10 w-10 rounded-md object-cover border border-border"
      />
    );
  }

  return (
    <div
      data-testid={`image-placeholder-${product.id}`}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
    >
      <ImageOff size={16} />
    </div>
  );
}

// ── Stock badge ─────────────────────────────────────────────────────────────

function StockBadge({ product }: { product: Product }) {
  if (product.stock === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{product.stock}</span>
        <span
          data-testid={`out-of-stock-badge-${product.id}`}
          className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
        >
          Hết hàng
        </span>
      </div>
    );
  }

  if (product.stock <= LOW_STOCK_THRESHOLD) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">{product.stock}</span>
        <span
          data-testid={`low-stock-badge-${product.id}`}
          className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
        >
          Sắp hết
        </span>
      </div>
    );
  }

  return <span className="text-sm text-foreground">{product.stock}</span>;
}

// ── Table row ───────────────────────────────────────────────────────────────

function ProductRow({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <tr className="border-b border-border transition-colors hover:bg-muted/30">
      {/* Ảnh */}
      <td className="px-4 py-3">
        <ProductThumbnail product={product} />
      </td>

      {/* Tên sản phẩm */}
      <td className="px-4 py-3">
        <span className="font-medium text-foreground">{product.name}</span>
      </td>

      {/* Giá */}
      <td className="px-4 py-3">
        <span className="font-semibold text-accent">${product.price}</span>
      </td>

      {/* Tồn kho */}
      <td className="px-4 py-3">
        <StockBadge product={product} />
      </td>

      {/* Thao tác */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            data-testid={`edit-btn-${product.id}`}
            onClick={() => onEdit(product)}
            aria-label={`Sửa ${product.name}`}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-colors",
              "hover:bg-accent/10 hover:text-accent"
            )}
          >
            <Edit2 size={16} />
          </button>
          <button
            data-testid={`delete-btn-${product.id}`}
            onClick={() => onDelete(product.id)}
            aria-label={`Xóa ${product.name}`}
            className={cn(
              "rounded-md p-1.5 text-muted-foreground transition-colors",
              "hover:bg-destructive/10 hover:text-destructive"
            )}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <tr>
      <td colSpan={5}>
        <div
          data-testid="empty-state"
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <ImageOff size={48} className="mb-4 text-muted-foreground/40" />
          <p className="text-base font-medium text-muted-foreground">
            Chưa có sản phẩm nào
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Hãy thêm sản phẩm đầu tiên bằng nút "Thêm sản phẩm"
          </p>
        </div>
      </td>
    </tr>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ProductTable({ products, onEdit, onDelete }: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ảnh
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tên sản phẩm
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Giá
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tồn kho
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <EmptyState />
            ) : (
              products.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
