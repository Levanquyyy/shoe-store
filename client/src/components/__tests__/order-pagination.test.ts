import { describe, it, expect } from "vitest";

/**
 * Pagination interfaces
 */
interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagination logic tests
 */
describe("Order List Pagination", () => {
  describe("calculateTotalPages", () => {
    const calculateTotalPages = (totalItems: number, pageSize: number): number => {
      if (pageSize <= 0) return 0;
      return Math.ceil(totalItems / pageSize);
    };

    it("should calculate correct number of pages", () => {
      expect(calculateTotalPages(100, 10)).toBe(10);
      expect(calculateTotalPages(101, 10)).toBe(11);
      expect(calculateTotalPages(50, 10)).toBe(5);
    });

    it("should return 1 page for items less than page size", () => {
      expect(calculateTotalPages(5, 10)).toBe(1);
      expect(calculateTotalPages(1, 10)).toBe(1);
    });

    it("should return 0 for zero items", () => {
      expect(calculateTotalPages(0, 10)).toBe(0);
    });

    it("should handle edge case with page size of 1", () => {
      expect(calculateTotalPages(5, 1)).toBe(5);
      expect(calculateTotalPages(1, 1)).toBe(1);
    });
  });

  describe("paginateItems", () => {
    const mockOrders = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      orderNumber: `ORD-${String(i + 1).padStart(3, "0")}`,
    }));

    const paginateItems = <T>(
      items: T[],
      currentPage: number,
      pageSize: number
    ): PaginatedResult<T> => {
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / pageSize);

      // Validate page number
      const validPage = Math.max(1, Math.min(currentPage, totalPages || 1));

      const startIndex = (validPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = items.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        currentPage: validPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      };
    };

    it("should return first page items", () => {
      const result = paginateItems(mockOrders, 1, 10);

      expect(result.items).toHaveLength(10);
      expect(result.items[0].id).toBe(1);
      expect(result.items[9].id).toBe(10);
      expect(result.currentPage).toBe(1);
    });

    it("should return correct items for middle page", () => {
      const result = paginateItems(mockOrders, 5, 10);

      expect(result.items).toHaveLength(10);
      expect(result.items[0].id).toBe(41);
      expect(result.items[9].id).toBe(50);
    });

    it("should return last page with remaining items", () => {
      const result = paginateItems(mockOrders, 10, 10);

      expect(result.items).toHaveLength(10);
      expect(result.items[0].id).toBe(91);
      expect(result.items[9].id).toBe(100);
    });

    it("should handle page size larger than total items", () => {
      const result = paginateItems(mockOrders, 1, 200);

      expect(result.items).toHaveLength(100);
      expect(result.totalPages).toBe(1);
    });

    it("should clamp invalid page numbers", () => {
      const resultNegative = paginateItems(mockOrders, -1, 10);
      const resultZero = paginateItems(mockOrders, 0, 10);
      const resultTooHigh = paginateItems(mockOrders, 999, 10);

      expect(resultNegative.currentPage).toBe(1);
      expect(resultZero.currentPage).toBe(1);
      expect(resultTooHigh.currentPage).toBe(10);
    });

    it("should calculate pagination metadata correctly", () => {
      const result = paginateItems(mockOrders, 1, 10);

      expect(result.totalItems).toBe(100);
      expect(result.totalPages).toBe(10);
      expect(result.hasNextPage).toBe(true);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("should reflect correct next/previous page status", () => {
      const firstPage = paginateItems(mockOrders, 1, 10);
      const middlePage = paginateItems(mockOrders, 5, 10);
      const lastPage = paginateItems(mockOrders, 10, 10);

      expect(firstPage.hasNextPage).toBe(true);
      expect(firstPage.hasPreviousPage).toBe(false);

      expect(middlePage.hasNextPage).toBe(true);
      expect(middlePage.hasPreviousPage).toBe(true);

      expect(lastPage.hasNextPage).toBe(false);
      expect(lastPage.hasPreviousPage).toBe(true);
    });

    it("should handle empty list", () => {
      const result = paginateItems([], 1, 10);

      expect(result.items).toHaveLength(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
    });

    it("should handle single item", () => {
      const result = paginateItems([mockOrders[0]], 1, 10);

      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
    });
  });

  describe("usePaginationState", () => {
    interface UsePaginationState {
      currentPage: number;
      pageSize: number;
      setCurrentPage: (page: number) => void;
      nextPage: () => void;
      previousPage: () => void;
      resetPage: () => void;
      totalPages: number;
    }

    const createPaginationState = (initialPageSize = 10): UsePaginationState => {
      let currentPage = 1;
      let pageSize = initialPageSize;

      return {
        get currentPage() {
          return currentPage;
        },
        get pageSize() {
          return pageSize;
        },
        setCurrentPage: (page: number) => {
          currentPage = Math.max(1, page);
        },
        nextPage: function () {
          this.setCurrentPage(currentPage + 1);
        },
        previousPage: function () {
          this.setCurrentPage(currentPage - 1);
        },
        resetPage: function () {
          currentPage = 1;
        },
        get totalPages() {
          return calculateTotalPages(100, pageSize);
        },
      };
    };

    it("should initialize with page 1", () => {
      const state = createPaginationState();
      expect(state.currentPage).toBe(1);
    });

    it("should increment to next page", () => {
      const state = createPaginationState();
      state.nextPage();
      expect(state.currentPage).toBe(2);
    });

    it("should decrement to previous page", () => {
      const state = createPaginationState();
      state.nextPage();
      state.previousPage();
      expect(state.currentPage).toBe(1);
    });

    it("should not go below page 1", () => {
      const state = createPaginationState();
      state.previousPage();
      expect(state.currentPage).toBe(1);
    });

    it("should reset to page 1", () => {
      const state = createPaginationState();
      state.setCurrentPage(5);
      state.resetPage();
      expect(state.currentPage).toBe(1);
    });

    it("should set custom page number", () => {
      const state = createPaginationState();
      state.setCurrentPage(7);
      expect(state.currentPage).toBe(7);
    });

    it("should clamp invalid page numbers", () => {
      const state = createPaginationState();
      state.setCurrentPage(-5);
      expect(state.currentPage).toBe(1);

      state.setCurrentPage(0);
      expect(state.currentPage).toBe(1);
    });
  });

  describe("pageSizeOptions", () => {
    const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

    it("should have valid page size options", () => {
      expect(PAGE_SIZE_OPTIONS).toContain(10);
      expect(PAGE_SIZE_OPTIONS).toContain(20);
      expect(PAGE_SIZE_OPTIONS.length).toBeGreaterThan(0);
    });

    it("should support different page sizes", () => {
      const mockOrders = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

      const paginate = <T>(items: T[], page: number, size: number) => {
        return {
          items: items.slice((page - 1) * size, page * size),
          total: items.length,
        };
      };

      const result5 = paginate(mockOrders, 1, 5);
      const result10 = paginate(mockOrders, 1, 10);
      const result20 = paginate(mockOrders, 1, 20);

      expect(result5.items).toHaveLength(5);
      expect(result10.items).toHaveLength(10);
      expect(result20.items).toHaveLength(20);
    });
  });

  describe("paginationEdgeCases", () => {
    const paginateItems = <T>(
      items: T[],
      currentPage: number,
      pageSize: number
    ): PaginatedResult<T> => {
      const totalItems = items.length;
      const totalPages = Math.ceil(totalItems / pageSize) || 1;
      const validPage = Math.max(1, Math.min(currentPage, totalPages));

      return {
        items: items.slice((validPage - 1) * pageSize, validPage * pageSize),
        currentPage: validPage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      };
    };

    it("should handle very small page size", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const result = paginateItems(items, 1, 1);

      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(10);
    });

    it("should handle page size equal to total items", () => {
      const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
      const result = paginateItems(items, 1, 10);

      expect(result.items).toHaveLength(10);
      expect(result.totalPages).toBe(1);
    });

    it("should properly calculate last page with uneven division", () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const result3 = paginateItems(items, 3, 10);

      expect(result3.items).toHaveLength(5);
      expect(result3.totalPages).toBe(3);
    });
  });
});
