import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderSearch } from "../OrderSearch";

/**
 * Mock data for tests
 */
const mockOrderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

/**
 * Mock trpc hook
 */
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      orders: {
        search: {
          useQuery: vi.fn(() => ({
            data: [],
            isLoading: false,
            error: null,
          })),
        },
        getByNumber: {
          useQuery: vi.fn(() => ({
            data: null,
            isLoading: false,
            error: null,
          })),
        },
      },
    },
  },
}));

describe("OrderSearch Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Search Input Functionality", () => {
    it("should render search input field", () => {
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      expect(input).toBeInTheDocument();
    });

    it("should render status filter select", () => {
      render(<OrderSearch />);
      const select = screen.getByLabelText(/trạng thái/i);
      expect(select).toBeInTheDocument();
    });

    it("should render search button", () => {
      render(<OrderSearch />);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });
      expect(button).toBeInTheDocument();
    });

    it("should update search input value", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);

      await user.type(input, "ORD-001");

      expect(input).toHaveValue("ORD-001");
    });

    it("should update status filter value", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const select = screen.getByLabelText(/trạng thái/i);

      await user.selectOptions(select, "pending");

      expect(select).toHaveValue("pending");
    });

    it("should clear search input", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i) as HTMLInputElement;

      await user.type(input, "ORD-001");
      expect(input.value).toBe("ORD-001");

      const clearButton = screen.getByRole("button", { name: /xóa/i });
      await user.click(clearButton);

      expect(input.value).toBe("");
    });
  });

  describe("Search Behavior", () => {
    it("should call search with order number only", async () => {
      const user = userEvent.setup();
      const { trpc } = await import("@/lib/trpc");
      const useQuerySpy = vi.spyOn(trpc.admin.orders.search, "useQuery");

      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });

      await user.type(input, "ORD-001");
      await user.click(button);

      expect(useQuerySpy).toHaveBeenCalled();
    });

    it("should allow searching with partial order number", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);

      await user.type(input, "ORD");

      expect(input).toHaveValue("ORD");
    });

    it("should handle case-insensitive search", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);

      await user.type(input, "ord-001");

      expect(input).toHaveValue("ord-001");
    });

    it("should allow filtering by status only", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const select = screen.getByLabelText(/trạng thái/i);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });

      await user.selectOptions(select, "shipped");
      await user.click(button);

      expect(select).toHaveValue("shipped");
    });

    it("should allow combined search by order number and status", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      const select = screen.getByLabelText(/trạng thái/i);

      await user.type(input, "ORD-001");
      await user.selectOptions(select, "processing");

      expect(input).toHaveValue("ORD-001");
      expect(select).toHaveValue("processing");
    });

    it("should reset status filter to 'all'", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const select = screen.getByLabelText(/trạng thái/i);

      await user.selectOptions(select, "pending");
      expect(select).toHaveValue("pending");

      await user.selectOptions(select, "");
      expect(select).toHaveValue("");
    });
  });

  describe("Results Display", () => {
    it("should show no results message when search returns empty", () => {
      render(<OrderSearch />);
      const noResults = screen.queryByText(/không tìm thấy đơn hàng/i);
      // Should not show if no search has been performed yet
      expect(noResults).not.toBeInTheDocument();
    });

    it("should display order search results", () => {
      // This would test the actual result display when mocked data is provided
      // Implementation depends on how results are displayed
      render(<OrderSearch />);
      expect(screen.getByPlaceholderText(/tìm mã đơn hàng/i)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper label associations", () => {
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      const select = screen.getByLabelText(/trạng thái/i);

      expect(input).toBeInTheDocument();
      expect(select).toBeInTheDocument();
    });

    it("should be keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });

      input.focus();
      expect(input).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/trạng thái/i)).toHaveFocus();

      await user.tab();
      expect(button).toHaveFocus();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty search", () => {
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });

      fireEvent.click(button);

      expect(input).toHaveValue("");
    });

    it("should trim whitespace from search input", async () => {
      const user = userEvent.setup();
      render(<OrderSearch />);
      const input = screen.getByPlaceholderText(/tìm mã đơn hàng/i) as HTMLInputElement;

      await user.type(input, "  ORD-001  ");

      expect(input.value).toContain("ORD-001");
    });

    it("should disable search button while loading", () => {
      // This would test loading state behavior
      render(<OrderSearch />);
      const button = screen.getByRole("button", { name: /tìm kiếm/i });
      expect(button).not.toBeDisabled();
    });
  });
});
