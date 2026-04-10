import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  totalItems: number;
  pageSize: number;
  ariaLabel?: string;
}

/**
 * Pagination component with page numbers and navigation
 */
export function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onNext,
  onPrevious,
  totalItems,
  pageSize,
  ariaLabel = "Pagination",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  // Calculate which page numbers to show
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav
      aria-label={ariaLabel}
      className="flex flex-col gap-4 items-center py-6 border-t border-border"
    >
      {/* Page info */}
      <div className="text-sm text-muted-foreground">
        Hiển thị {startItem} - {endItem} trong {totalItems}
      </div>

      {/* Navigation buttons and page numbers */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Previous button */}
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
          aria-label="Trang trước"
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Page numbers */}
        {pageNumbers.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onPageChange(pageNum)}
            aria-current={currentPage === pageNum ? "page" : undefined}
            className={`px-3 py-2 rounded-lg border transition-colors ${
              currentPage === pageNum
                ? "bg-accent text-accent-foreground border-accent font-semibold"
                : "border-border text-foreground hover:bg-secondary hover:border-accent"
            }`}
          >
            {pageNum}
          </button>
        ))}

        {/* Next button */}
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNextPage}
          aria-label="Trang sau"
          className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Optional: Page size selector */}
      <div className="text-xs text-muted-foreground">
        Trang {currentPage} / {totalPages}
      </div>
    </nav>
  );
}

/**
 * Calculate which page numbers to display (with ellipsis for large ranges)
 */
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages: number[] = [];
  const delta = 1; // Pages to show on either side of current page
  const left = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);

  // Always show first page
  if (left > 1) {
    pages.push(1);
    if (left > 2) {
      // Would show ellipsis here, but for now we just skip
    }
  }

  // Show pages around current
  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  // Always show last page
  if (right < totalPages) {
    if (right < totalPages - 1) {
      // Would show ellipsis here
    }
    pages.push(totalPages);
  }

  return pages;
}
