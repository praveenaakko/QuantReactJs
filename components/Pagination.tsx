
import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (size: number) => void;
  totalItems: number;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  pageSizeOptions = [5, 10, 25, 100],
}) => {
  const handlePrevPage = () => onPageChange(currentPage - 1);
  const handleNextPage = () => onPageChange(currentPage + 1);

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex justify-between items-center mt-4 flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <span className="font-greycliff text-sm text-white/70">Rows per page:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="bg-black/40 rounded-md font-greycliff text-sm focus:outline-none focus:ring-1 focus:ring-white/20 text-white p-1"
          aria-label="Select number of rows per page"
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
      
      <span className="font-greycliff text-sm text-white/70" aria-live="polite">
        {startItem} - {endItem} of {totalItems}
      </span>
      
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-white/10 text-white font-greycliff rounded-md hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to previous page"
        >
          <i className="ri-arrow-left-s-line"></i>
        </button>
        <span className="font-greycliff text-sm text-white/70" aria-label={`Page ${currentPage} of ${totalPages > 0 ? totalPages : 1}`}>
            Page {currentPage} of {totalPages > 0 ? totalPages : 1}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages || totalItems === 0}
          className="px-3 py-1 bg-white/10 text-white font-greycliff rounded-md hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Go to next page"
        >
          <i className="ri-arrow-right-s-line"></i>
        </button>
      </div>
    </div>
  );
};
