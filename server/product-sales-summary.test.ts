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
});