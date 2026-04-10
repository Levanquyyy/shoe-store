import { useState, useCallback } from "react";

export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Hook for managing pagination state and logic
 */
export function usePagination<T>(
  items: T[],
  pageSize: number = 10
) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  // Clamp page to valid range
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = items.slice(startIndex, endIndex);

  const result: PaginatedResult<T> = {
    items: paginatedItems,
    currentPage: validPage,
    pageSize,
    totalItems: items.length,
    totalPages,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
  };

  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, page);
    setCurrentPage(clamped);
  }, []);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1);
  }, []);

  const previousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    ...result,
    goToPage,
    nextPage,
    previousPage,
    resetPage,
  };
}

/**
 * Paginate items array
 */
export function paginateItems<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Clamp page to valid range
  const validPage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: items.slice(startIndex, endIndex),
    currentPage: validPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: validPage < totalPages,
    hasPreviousPage: validPage > 1,
  };
}
