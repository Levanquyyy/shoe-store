/**
 * TDD – ProductStatsCard component
 *
 * RED PHASE – Tests written before implementation.
 *
 * Component under test: ProductStatsCard
 *
 * Coverage targets:
 *  - Renders stat label correctly
 *  - Renders stat value correctly
 *  - Renders icon when provided
 *  - Applies accent color variant
 *  - Applies warning color variant (low stock)
 *  - Applies default color variant
 *  - Handles zero value
 *  - Handles large numbers (formatted)
 *  - Renders subtext when provided
 *  - Renders without subtext when not provided
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Package, AlertTriangle, DollarSign } from "lucide-react";

// Lazy import after mocks – component does not exist yet (RED phase)
const { ProductStatsCard } = await import("../ProductStatsCard");

describe("ProductStatsCard", () => {
  // ── Basic rendering ─────────────────────────────────────────────────────────

  it("renders the stat label", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={42} />);
    expect(screen.getByText("Tổng sản phẩm")).toBeInTheDocument();
  });

  it("renders the stat value as a number", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders zero value correctly", () => {
    render(<ProductStatsCard label="Cảnh báo tồn kho thấp" value={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders a formatted string value", () => {
    render(<ProductStatsCard label="Giá trị kho" value="$1,234,567" />);
    expect(screen.getByText("$1,234,567")).toBeInTheDocument();
  });

  // ── Icon ────────────────────────────────────────────────────────────────────

  it("renders icon when provided", () => {
    render(
      <ProductStatsCard
        label="Tổng sản phẩm"
        value={10}
        icon={<Package data-testid="icon-package" />}
      />
    );
    expect(screen.getByTestId("icon-package")).toBeInTheDocument();
  });

  it("renders without icon when not provided", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={10} />);
    // Should not throw and should still render the label
    expect(screen.getByText("Tổng sản phẩm")).toBeInTheDocument();
  });

  // ── Subtext ─────────────────────────────────────────────────────────────────

  it("renders subtext when provided", () => {
    render(
      <ProductStatsCard
        label="Tổng sản phẩm"
        value={10}
        subtext="Cập nhật vừa xong"
      />
    );
    expect(screen.getByText("Cập nhật vừa xong")).toBeInTheDocument();
  });

  it("does not render subtext element when subtext is not provided", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={10} />);
    expect(screen.queryByTestId("stats-subtext")).not.toBeInTheDocument();
  });

  // ── Color variants ──────────────────────────────────────────────────────────

  it("applies data-variant='default' attribute by default", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={10} />);
    expect(screen.getByTestId("product-stats-card")).toHaveAttribute(
      "data-variant",
      "default"
    );
  });

  it("applies data-variant='accent' when variant is accent", () => {
    render(
      <ProductStatsCard label="Tổng sản phẩm" value={10} variant="accent" />
    );
    expect(screen.getByTestId("product-stats-card")).toHaveAttribute(
      "data-variant",
      "accent"
    );
  });

  it("applies data-variant='warning' when variant is warning", () => {
    render(
      <ProductStatsCard
        label="Cảnh báo tồn kho thấp"
        value={3}
        variant="warning"
      />
    );
    expect(screen.getByTestId("product-stats-card")).toHaveAttribute(
      "data-variant",
      "warning"
    );
  });

  // ── Accessibility ───────────────────────────────────────────────────────────

  it("has a testid for querying", () => {
    render(<ProductStatsCard label="Tổng sản phẩm" value={10} />);
    expect(screen.getByTestId("product-stats-card")).toBeInTheDocument();
  });

  it("renders label and value in same card container", () => {
    render(<ProductStatsCard label="Giá trị kho" value="$500" />);
    const card = screen.getByTestId("product-stats-card");
    expect(card).toHaveTextContent("Giá trị kho");
    expect(card).toHaveTextContent("$500");
  });
});
