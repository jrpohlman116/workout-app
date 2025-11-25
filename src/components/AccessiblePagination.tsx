import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface AccessiblePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  itemName?: string;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
}

export default function AccessiblePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  itemName = 'items',
  showPageNumbers = true,
  maxVisiblePages = 5
}: AccessiblePaginationProps) {
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  const getVisiblePageNumbers = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const visiblePages = getVisiblePageNumbers();
  const showFirstPage = !visiblePages.includes(1);
  const showLastPage = !visiblePages.includes(totalPages);

  const getPageInfo = () => {
    if (!pageSize || !totalItems) return null;

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return { startItem, endItem };
  };

  const pageInfo = getPageInfo();

  return (
    <nav
      aria-label="Pagination navigation"
      className="bg-white rounded-xl shadow-sm p-4"
    >
      {pageInfo && (
        <div className="text-sm text-gray-600 mb-4 text-center">
          Showing {pageInfo.startItem} to {pageInfo.endItem} of {totalItems} {itemName}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={isFirstPage}
          aria-label="Go to first page"
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronsLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={isFirstPage}
          aria-label="Go to previous page"
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" aria-hidden="true" />
        </button>

        {showPageNumbers && (
          <>
            {showFirstPage && (
              <>
                <button
                  onClick={() => onPageChange(1)}
                  className="min-w-[40px] h-10 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Go to page 1"
                >
                  1
                </button>
                {!visiblePages.includes(2) && (
                  <span className="px-2 text-gray-500" aria-hidden="true">
                    ...
                  </span>
                )}
              </>
            )}

            {visiblePages.map((pageNum) => {
              const isCurrent = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={isCurrent}
                  aria-label={`${isCurrent ? 'Current page, ' : ''}Page ${pageNum}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`
                    min-w-[40px] h-10 rounded-lg font-medium transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    ${isCurrent
                      ? 'bg-blue-600 text-white cursor-default'
                      : 'border border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {pageNum}
                </button>
              );
            })}

            {showLastPage && (
              <>
                {!visiblePages.includes(totalPages - 1) && (
                  <span className="px-2 text-gray-500" aria-hidden="true">
                    ...
                  </span>
                )}
                <button
                  onClick={() => onPageChange(totalPages)}
                  className="min-w-[40px] h-10 rounded-lg border border-gray-300 hover:bg-gray-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </button>
              </>
            )}
          </>
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={isLastPage}
          aria-label="Go to next page"
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronRight className="w-5 h-5" aria-hidden="true" />
        </button>

        <button
          onClick={() => onPageChange(totalPages)}
          disabled={isLastPage}
          aria-label="Go to last page"
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronsRight className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Page {currentPage} of {totalPages}
      </div>
    </nav>
  );
}

interface LoadMoreButtonProps {
  onLoadMore: () => void;
  loading?: boolean;
  hasMore?: boolean;
  loadedCount?: number;
  totalCount?: number;
  itemName?: string;
}

export function LoadMoreButton({
  onLoadMore,
  loading = false,
  hasMore = true,
  loadedCount,
  totalCount,
  itemName = 'items'
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 font-medium">
          All {itemName} loaded
        </p>
        {loadedCount && (
          <p className="text-sm text-gray-500 mt-1">
            Showing all {loadedCount} {itemName}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      {loadedCount && totalCount && (
        <p className="text-sm text-gray-600 mb-4">
          Showing {loadedCount} of {totalCount} {itemName}
        </p>
      )}

      <button
        onClick={onLoadMore}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label={loading ? 'Loading more items' : 'Load more items'}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          'Load More'
        )}
      </button>
    </div>
  );
}
