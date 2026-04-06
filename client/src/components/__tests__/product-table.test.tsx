/**
 * TDD – ProductTable component
 *
 * RED PHASE – Tests written before implementation.
 *
 * Component under test: ProductTable
 *
 * Coverage targets:
 *  - Renders table headers: Image, Tên sản phẩm, Giá, Tồn kho, Thao tác
 *  - Renders one row per product
 *  - Shows product image thumbnail when imageUrl is present
 *  - Shows placeholder when imageUrl is absent
 *  - Shows product name in each row
 *  - Shows formatted price in each row
 *  - Shows stock count in each row
 *  - Shows low-stock badge when stock <= LOW_STOCK_THRESHOLD (10)
 *  - Does not show low-stock badge when stock > threshold
 *  - Edit button fires onEdit callback with correct product
 *  - Delete button fires onDelete callback with correct product id
 *  - Empty state is rendered when products array is empty
 *  - Empty state message is present
 *  - Handles undefined products gracefully
 *  - Renders 50 rows without crashing (performance)
 *  - Special characters in product name rendered as text (XSS safety)
 *  - Unicode product name renders correctly
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  imageUrl?: string | null;
  description?: string;
}

const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Air Max 90",
    price: "150.00",
    stock: 25,
    imageUrl: "https://example.com/airmax.jpg",
    description: "Classic Nike shoe",
  },
  {
    id: 2,
    name: "Jordan 1 Retro",
    price: "180.00",
    stock: 5,
    imageUrl: null,
    description: "Iconic Jordan shoe",
  },
  {
    id: 3,
    name: "Yeezy 350",
    price: "220.00",
    stock: 0,
    imageUrl: undefined,
    description: "Adidas Yeezy",
  },
];

// Lazy import – component does not exist yet (RED phase)
const { ProductTable } = await import("../ProductTable");

describe("ProductTable", () => {
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Table headers ───────────────────────────────────────────────────────────

  it("renders the Image column header", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Ảnh")).toBeInTheDocument();
  });

  it("renders the product name column header", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Tên sản phẩm")).toBeInTheDocument();
  });

  it("renders the price column header", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Giá")).toBeInTheDocument();
  });

  it("renders the stock column header", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Tồn kho")).toBeInTheDocument();
  });

  it("renders the actions column header", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Thao tác")).toBeInTheDocument();
  });

  // ── Row rendering ───────────────────────────────────────────────────────────

  it("renders one table row per product", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // 3 products → 3 data rows (plus 1 header row)
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(MOCK_PRODUCTS.length + 1); // +1 for header
  });

  it("renders product name in each row", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Air Max 90")).toBeInTheDocument();
    expect(screen.getByText("Jordan 1 Retro")).toBeInTheDocument();
    expect(screen.getByText("Yeezy 350")).toBeInTheDocument();
  });

  it("renders formatted price in each row", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("$150.00")).toBeInTheDocument();
    expect(screen.getByText("$180.00")).toBeInTheDocument();
    expect(screen.getByText("$220.00")).toBeInTheDocument();
  });

  it("renders stock count in each row", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  // ── Image thumbnail ─────────────────────────────────────────────────────────

  it("renders product image thumbnail when imageUrl is present", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    const img = screen.getByRole("img", { name: /air max 90/i });
    expect(img).toHaveAttribute("src", "https://example.com/airmax.jpg");
  });

  it("renders placeholder when imageUrl is null", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[1]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("image-placeholder-2")).toBeInTheDocument();
  });

  it("renders placeholder when imageUrl is undefined", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[2]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("image-placeholder-3")).toBeInTheDocument();
  });

  // ── Low-stock badge ─────────────────────────────────────────────────────────

  it("shows low-stock badge when stock is at threshold (10)", () => {
    const product: Product = { id: 10, name: "Test Shoe", price: "100.00", stock: 10 };
    render(
      <ProductTable
        products={[product]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("low-stock-badge-10")).toBeInTheDocument();
  });

  it("shows low-stock badge when stock is below threshold", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[1]]} // stock: 5
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("low-stock-badge-2")).toBeInTheDocument();
  });

  it("shows out-of-stock badge when stock is 0", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[2]]} // stock: 0
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByTestId("out-of-stock-badge-3")).toBeInTheDocument();
  });

  it("does not show low-stock badge when stock is above threshold", () => {
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[0]]} // stock: 25
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.queryByTestId("low-stock-badge-1")).not.toBeInTheDocument();
  });

  // ── Action buttons ──────────────────────────────────────────────────────────

  it("calls onEdit with the correct product when Edit button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    await user.click(screen.getByTestId("edit-btn-1"));
    expect(mockOnEdit).toHaveBeenCalledWith(MOCK_PRODUCTS[0]);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it("calls onDelete with the correct product id when Delete button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ProductTable
        products={[MOCK_PRODUCTS[0]]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    await user.click(screen.getByTestId("delete-btn-1"));
    expect(mockOnDelete).toHaveBeenCalledWith(1);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it("each row has independent Edit and Delete buttons", async () => {
    const user = userEvent.setup();
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    await user.click(screen.getByTestId("edit-btn-2"));
    expect(mockOnEdit).toHaveBeenCalledWith(MOCK_PRODUCTS[1]);

    await user.click(screen.getByTestId("delete-btn-3"));
    expect(mockOnDelete).toHaveBeenCalledWith(3);
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  it("renders empty state when products array is empty", () => {
    render(
      <ProductTable products={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("shows empty state message", () => {
    render(
      <ProductTable products={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    expect(screen.getByText(/chưa có sản phẩm/i)).toBeInTheDocument();
  });

  it("does not render any data rows when products is empty", () => {
    render(
      <ProductTable products={[]} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    // Only header row should be visible, no data rows
    expect(screen.queryByTestId(/^edit-btn-/)).not.toBeInTheDocument();
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("renders 50 products without crashing (performance)", () => {
    const bulk = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Sản phẩm ${i + 1}`,
      price: "99.99",
      stock: i * 2,
    }));
    render(
      <ProductTable
        products={bulk}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Sản phẩm 1")).toBeInTheDocument();
    expect(screen.getByText("Sản phẩm 50")).toBeInTheDocument();
  });

  it("renders product name with special characters as text (XSS safety)", () => {
    const xss: Product = {
      id: 999,
      name: "<script>alert('xss')</script>",
      price: "1.00",
      stock: 1,
    };
    render(
      <ProductTable products={[xss]} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    expect(screen.getByText("<script>alert('xss')</script>")).toBeInTheDocument();
  });

  it("renders Unicode product name correctly", () => {
    const unicode: Product = {
      id: 888,
      name: "Giày Nguyễn Văn A 👟",
      price: "50.00",
      stock: 100,
    };
    render(
      <ProductTable
        products={[unicode]}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText("Giày Nguyễn Văn A 👟")).toBeInTheDocument();
  });

  it("renders correct number of action buttons (2 per product)", () => {
    render(
      <ProductTable
        products={MOCK_PRODUCTS}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // 3 products × 2 buttons (edit + delete) = 6
    expect(screen.getAllByTestId(/^edit-btn-/).length).toBe(3);
    expect(screen.getAllByTestId(/^delete-btn-/).length).toBe(3);
  });
});
