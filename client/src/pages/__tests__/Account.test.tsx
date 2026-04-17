import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUseAuth = vi.fn();

const MOCK_USER = {
  id: 1,
  name: "Nguyen Van A",
  email: "a@example.com",
  role: "user" as const,
};

const MOCK_ORDERS = [
  {
    id: 11,
    orderNumber: "ORD-11",
    status: "pending",
    total: "120.00",
    createdAt: new Date("2026-04-01T10:00:00Z"),
    shippingAddress: {
      fullName: "Nguyen Van A",
      address: "1 Nguyen Trai",
      city: "HCM",
      state: "VN",
      zipCode: "700000",
    },
  },
  {
    id: 12,
    orderNumber: "ORD-12",
    status: "processing",
    total: "240.00",
    createdAt: new Date("2026-04-02T10:00:00Z"),
    shippingAddress: {
      fullName: "Nguyen Van A",
      address: "1 Nguyen Trai",
      city: "HCM",
      state: "VN",
      zipCode: "700000",
    },
  },
  {
    id: 13,
    orderNumber: "ORD-13",
    status: "shipped",
    total: "360.00",
    createdAt: new Date("2026-04-03T10:00:00Z"),
    shippingAddress: {
      fullName: "Nguyen Van A",
      address: "1 Nguyen Trai",
      city: "HCM",
      state: "VN",
      zipCode: "700000",
    },
  },
];

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockCancelOrder = vi.fn();
const mockLogout = vi.fn();
const mockOrdersRefetch = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    orders: {
      list: {
        useQuery: () => ({
          data: MOCK_ORDERS,
          refetch: mockOrdersRefetch,
        }),
      },
      cancel: {
        useMutation: () => ({
          mutate: mockCancelOrder,
          isPending: false,
        }),
      },
    },
    auth: {
      logout: {
        useMutation: () => ({
          mutate: mockLogout,
        }),
      },
    },
  },
}));

const { default: Account } = await import("../Account");

describe("Account page order cancellation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: MOCK_USER,
      isAuthenticated: true,
      loading: false,
      logout: vi.fn(),
    });
  });

  it("shows cancel buttons for pending and processing orders only", () => {
    render(<Account />);

    expect(screen.getAllByRole("button", { name: /hủy đơn hàng/i })).toHaveLength(2);
  });

  it("calls cancel mutation when a cancellable order is clicked", async () => {
    const user = userEvent.setup();
    render(<Account />);

    await user.click(screen.getAllByRole("button", { name: /hủy đơn hàng/i })[0]);

    expect(mockCancelOrder).toHaveBeenCalledWith({ orderId: 11 });
  });
});