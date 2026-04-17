import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";

describe("getProductSalesSummary", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates revenue and top-selling products from non-cancelled orders", () => {
    const summary = db.summarizeProductSales([
      {
        status: "delivered",
        total: "120.00",
        items: [
          { productId: 10, productName: "Air Max 90", price: "60.00", quantity: 2 },
          { productId: 11, productName: "Jordan 1", price: "30.00", quantity: 1 },
        ],
      },
      {
        status: "processing",
        total: "80.00",
        items: [
          { productId: 10, productName: "Air Max 90", price: "60.00", quantity: 1 },
        ],
      },
      {
        status: "cancelled",
        total: "999.00",
        items: [
          { productId: 12, productName: "Yeezy 350", price: "999.00", quantity: 1 },
        ],
      },
    ] as any);

    expect(summary.totalRevenue).toBe("200.00");
    expect(summary.totalUnitsSold).toBe(4);
    expect(summary.topProducts).toEqual([
      {
        productId: 10,
        productName: "Air Max 90",
        quantity: 3,
        revenue: "180.00",
      },
      {
        productId: 11,
        productName: "Jordan 1",
        quantity: 1,
        revenue: "30.00",
      },
    ]);
  });

  it("builds a dashboard insight list including unsold products", async () => {
    const dashboard = db.buildProductSalesDashboard(
      [
        { id: 1, name: "Air Max 90", price: "60.00", stock: 12 },
        { id: 2, name: "Jordan 1", price: "100.00", stock: 4 },
        { id: 3, name: "Yeezy 350", price: "200.00", stock: 8 },
      ] as any,
      [
      {
        status: "delivered",
        total: "120.00",
        items: [
          { productId: 1, productName: "Air Max 90", price: "60.00", quantity: 2 },
          { productId: 2, productName: "Jordan 1", price: "100.00", quantity: 1 },
        ],
      },
      {
        status: "processing",
        total: "60.00",
        items: [
          { productId: 1, productName: "Air Max 90", price: "60.00", quantity: 1 },
        ],
      },
      ] as any
    );

    expect(dashboard.insights).toHaveLength(3);
    expect(dashboard.insights[0]).toMatchObject({
      productName: "Air Max 90",
      quantitySold: 3,
      revenue: "180.00",
    });
    expect(dashboard.insights.find((item) => item.productName === "Yeezy 350")).toMatchObject({
      quantitySold: 0,
      revenue: "0.00",
    });
  });
});