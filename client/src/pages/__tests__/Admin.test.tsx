/**
 * TDD – Admin Page: Tab Navigation
 *
 * RED PHASE – Tests written before refactoring Admin.tsx.
 *
 * Features under test:
 *  - Tab navigation: Orders / Categories / Products / Consultations
 *  - Only admin users can access the page
 *  - Each tab renders the appropriate section/component
 *  - Default tab on first render
 *  - Tab state switches on click
 *  - Consultations tab renders AdminConsultationDashboard
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock useAuth
// ---------------------------------------------------------------------------

const mockUseAuth = vi.fn();

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// Mock wouter (Link, useLocation etc.)
// ---------------------------------------------------------------------------

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: () => ["/admin", vi.fn()],
}));

// ---------------------------------------------------------------------------
// Mock tRPC – only the hooks used in Admin.tsx and its children
// ---------------------------------------------------------------------------

vi.mock("@/lib/trpc", () => ({
  trpc: {
    products: {
      list: {
        useQuery: () => ({ data: [], refetch: vi.fn() }),
      },
    },
    categories: {
      list: {
        useQuery: () => ({ data: [] }),
      },
    },
    admin: {
      products: {
        delete: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        create: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        salesSummary: {
          useQuery: () => ({
            data: {
              totalRevenue: "0.00",
              totalUnitsSold: 0,
              topProducts: [],
              insights: [],
            },
            isLoading: false,
            error: null,
          }),
        },
        categories: {
          create: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          update: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
          delete: {
            useMutation: () => ({ mutate: vi.fn(), isPending: false }),
          },
        },
      },
      categories: {
        create: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        update: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
        delete: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
      orders: {
        list: {
          useQuery: () => ({ data: [], refetch: vi.fn() }),
        },
        updateStatus: {
          useMutation: () => ({ mutate: vi.fn(), isPending: false }),
        },
      },
    },
    orders: {
      list: {
        useQuery: () => ({ data: [], refetch: vi.fn() }),
      },
    },
    consultation: {
      adminGetAllConsultations: {
        useQuery: () => ({ data: [], isLoading: false, error: null }),
      },
      getMessages: {
        useQuery: () => ({ data: [], isLoading: false, error: null }),
      },
      sendMessage: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
      close: {
        useMutation: () => ({ mutate: vi.fn(), isPending: false }),
      },
    },
    useUtils: () => ({
      consultation: {
        getMessages: { invalidate: vi.fn() },
        adminGetAllConsultations: { invalidate: vi.fn() },
      },
    }),
  },
}));

// ---------------------------------------------------------------------------
// Mock child components to isolate Admin page navigation logic
// ---------------------------------------------------------------------------

vi.mock("@/components/OrderManager", () => ({
  default: () => <div data-testid="order-manager">OrderManager</div>,
}));

vi.mock("@/components/CategoryManager", () => ({
  default: () => <div data-testid="category-manager">CategoryManager</div>,
}));

vi.mock("@/components/AdminConsultationDashboard", () => ({
  AdminConsultationDashboard: () => (
    <div data-testid="admin-consultation-dashboard">AdminConsultationDashboard</div>
  ),
}));

// ---------------------------------------------------------------------------
// Lazy-import after mocks
// ---------------------------------------------------------------------------

const { default: Admin } = await import("../Admin");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_USER = {
  id: 1,
  name: "Admin",
  email: "admin@test.com",
  role: "admin" as const,
};

const REGULAR_USER = {
  id: 2,
  name: "User",
  email: "user@test.com",
  role: "user" as const,
};

// ===========================================================================
// Tests
// ===========================================================================

describe("Admin page – authorization", () => {
  it("shows access denied message for unauthenticated users", () => {
    mockUseAuth.mockReturnValue({ user: null, isAuthenticated: false, loading: false });
    render(<Admin />);
    expect(screen.getByText(/quyền quản trị|access denied|forbidden|không có quyền/i)).toBeInTheDocument();
  });

  it("shows access denied message for non-admin authenticated users", () => {
    mockUseAuth.mockReturnValue({ user: REGULAR_USER, isAuthenticated: true, loading: false });
    render(<Admin />);
    expect(screen.getByText(/quyền quản trị|access denied|forbidden|không có quyền/i)).toBeInTheDocument();
  });

  it("does not render tab navigation for non-admin users", () => {
    mockUseAuth.mockReturnValue({ user: REGULAR_USER, isAuthenticated: true, loading: false });
    render(<Admin />);
    expect(screen.queryByRole("tab", { name: /consultations|tư vấn/i })).not.toBeInTheDocument();
  });

  it("renders the admin dashboard for admin users", () => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, isAuthenticated: true, loading: false });
    render(<Admin />);
    // Should show admin content, not access denied
    expect(screen.queryByText(/quyền quản trị/i)).not.toBeInTheDocument();
  });
});

describe("Admin page – tab navigation", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, isAuthenticated: true, loading: false });
  });

  // ── Tab presence ────────────────────────────────────────────────────────────

  it("renders Đơn hàng (Orders) tab", () => {
    render(<Admin />);
    expect(screen.getByRole("tab", { name: /đơn hàng|orders/i })).toBeInTheDocument();
  });

  it("renders Danh mục (Categories) tab", () => {
    render(<Admin />);
    expect(screen.getByRole("tab", { name: /danh mục|categories/i })).toBeInTheDocument();
  });

  it("renders Sản phẩm (Products) tab", () => {
    render(<Admin />);
    expect(screen.getByRole("tab", { name: /sản phẩm|products/i })).toBeInTheDocument();
  });

  it("renders Tư vấn khách (Consultations) tab", () => {
    render(<Admin />);
    expect(screen.getByRole("tab", { name: /tư vấn|consultations/i })).toBeInTheDocument();
  });

  // ── Default tab ────────────────────────────────────────────────────────────

  it("shows Orders content by default (first render)", () => {
    render(<Admin />);
    expect(screen.getByTestId("order-manager")).toBeInTheDocument();
  });

  it("does not show Consultations content on first render (default is Orders)", () => {
    render(<Admin />);
    expect(screen.queryByTestId("admin-consultation-dashboard")).not.toBeInTheDocument();
  });

  // ── Tab switching ──────────────────────────────────────────────────────────

  it("shows Categories content when Danh mục tab is clicked", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /danh mục|categories/i }));
    expect(screen.getByTestId("category-manager")).toBeInTheDocument();
  });

  it("hides Orders content after switching to Categories tab", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /danh mục|categories/i }));
    expect(screen.queryByTestId("order-manager")).not.toBeInTheDocument();
  });

  it("shows Products content when Sản phẩm tab is clicked", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /sản phẩm|products/i }));
    // Products section has specific heading
    expect(screen.getByText(/quản lý sản phẩm|manage products|products/i)).toBeInTheDocument();
  });

  it("shows revenue and best-selling product stats in the products tab", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /sản phẩm|products/i }));

    expect(screen.getByText(/doanh thu/i)).toBeInTheDocument();
    expect(screen.getByText(/bán chạy/i)).toBeInTheDocument();
  });

  it("renders search and filter controls for product sales insights", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /sản phẩm|products/i }));

    expect(screen.getByPlaceholderText(/tìm sản phẩm/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bán ế/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chưa bán/i })).toBeInTheDocument();
  });

  it("shows AdminConsultationDashboard when Tư vấn tab is clicked", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    expect(screen.getByTestId("admin-consultation-dashboard")).toBeInTheDocument();
  });

  it("hides AdminConsultationDashboard when switching away from Tư vấn tab", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    expect(screen.getByTestId("admin-consultation-dashboard")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /đơn hàng|orders/i }));
    expect(screen.queryByTestId("admin-consultation-dashboard")).not.toBeInTheDocument();
  });

  it("can switch back to Orders tab after visiting Tư vấn tab", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    await user.click(screen.getByRole("tab", { name: /đơn hàng|orders/i }));
    expect(screen.getByTestId("order-manager")).toBeInTheDocument();
  });

  // ── Active tab styling ─────────────────────────────────────────────────────

  it("marks the active tab with aria-selected=true", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    expect(
      screen.getByRole("tab", { name: /tư vấn|consultations/i })
    ).toHaveAttribute("aria-selected", "true");
  });

  it("marks inactive tabs with aria-selected=false", async () => {
    const user = userEvent.setup();
    render(<Admin />);
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    expect(
      screen.getByRole("tab", { name: /đơn hàng|orders/i })
    ).toHaveAttribute("aria-selected", "false");
  });
});

describe("Admin page – navigation header", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, isAuthenticated: true, loading: false });
  });

  it("renders the FootWare Admin brand link", () => {
    render(<Admin />);
    expect(screen.getByText(/footware admin/i)).toBeInTheDocument();
  });

  it("renders a link back to account page", () => {
    render(<Admin />);
    expect(screen.getByText(/quay lại tài khoản|back to account/i)).toBeInTheDocument();
  });
});

describe("Admin page – Consultations tab integration", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: ADMIN_USER, isAuthenticated: true, loading: false });
  });

  it("AdminConsultationDashboard is only mounted after clicking Tư vấn tab", async () => {
    const user = userEvent.setup();
    render(<Admin />);

    // Before clicking - should not be mounted
    expect(screen.queryByTestId("admin-consultation-dashboard")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));

    // After clicking - should be mounted
    await waitFor(() => {
      expect(screen.getByTestId("admin-consultation-dashboard")).toBeInTheDocument();
    });
  });

  it("only one content panel is visible at a time", async () => {
    const user = userEvent.setup();
    render(<Admin />);

    // Switch to each tab and verify only one panel is visible
    await user.click(screen.getByRole("tab", { name: /tư vấn|consultations/i }));
    expect(screen.getByTestId("admin-consultation-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("order-manager")).not.toBeInTheDocument();
    expect(screen.queryByTestId("category-manager")).not.toBeInTheDocument();
  });
});
