import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { ProductSalesInsights } from "../ProductSalesInsights";

const ITEMS = [
  { productId: 1, productName: "Air Max 90", price: "60.00", stock: 12, quantitySold: 9, revenue: "540.00" },
  { productId: 2, productName: "Jordan 1", price: "100.00", stock: 4, quantitySold: 2, revenue: "200.00" },
  { productId: 3, productName: "Yeezy 350", price: "200.00", stock: 8, quantitySold: 0, revenue: "0.00" },
  { productId: 4, productName: "Puma Run", price: "80.00", stock: 6, quantitySold: 1, revenue: "80.00" },
  { productId: 5, productName: "Nike Court", price: "75.00", stock: 10, quantitySold: 6, revenue: "450.00" },
  { productId: 6, productName: "Adidas Samba", price: "90.00", stock: 7, quantitySold: 3, revenue: "270.00" },
];

describe("ProductSalesInsights", () => {
  it("renders search, filter and pagination controls", () => {
    render(<ProductSalesInsights items={ITEMS} />);

    expect(screen.getByPlaceholderText(/tìm sản phẩm/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bán ế/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chưa bán/i })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /phân trang top sản phẩm bán chạy/i })).toBeInTheDocument();
  });

  it("filters products by name", async () => {
    const user = userEvent.setup();
    render(<ProductSalesInsights items={ITEMS} />);

    await user.type(screen.getByPlaceholderText(/tìm sản phẩm/i), "Yeezy");

    expect(screen.getByText("Yeezy 350")).toBeInTheDocument();
    expect(screen.queryByText("Air Max 90")).not.toBeInTheDocument();
  });

  it("filters slow-moving products and unsold products", async () => {
    const user = userEvent.setup();
    render(<ProductSalesInsights items={ITEMS} />);

    await user.click(screen.getByRole("button", { name: /bán ế/i }));
    expect(screen.getByText("Jordan 1")).toBeInTheDocument();
    expect(screen.getByText("Puma Run")).toBeInTheDocument();
    expect(screen.queryByText("Air Max 90")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /chưa bán/i }));
    expect(screen.getByText("Yeezy 350")).toBeInTheDocument();
    expect(screen.queryByText("Jordan 1")).not.toBeInTheDocument();
  });
});