"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Props {
  pages: number;
  currentPage: number;
  onPageChange?: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const getVisiblePages = (total: number, current: number, delta = 1) => {
  const range: number[] = [];

  for (
    let i = Math.max(1, current - delta);
    i <= Math.min(total, current + delta);
    i++
  ) {
    range.push(i);
  }

  return range;
};

const PaginationComp = ({
  pages,
  currentPage,
  onPageChange,
  hasNextPage,
  hasPrevPage,
}: Props) => {
  const visiblePages = getVisiblePages(pages, currentPage);

  const handleClick = (page: number, e: React.MouseEvent) => {
    e.preventDefault();
    onPageChange?.(page);
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => hasPrevPage && handleClick(currentPage - 1, e)}
            isActive={hasPrevPage}
          />
        </PaginationItem>

        {visiblePages[0] > 1 && (
          <>
            <PaginationItem>
              <PaginationLink href="#" onClick={(e) => handleClick(1, e)}>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationEllipsis />
          </>
        )}

        {visiblePages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              isActive={currentPage === page}
              onClick={(e) => handleClick(page, e)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        {visiblePages[visiblePages.length - 1] < pages && (
          <>
            <PaginationEllipsis />
            <PaginationItem>
              <PaginationLink onClick={(e) => handleClick(pages, e)}>
                {pages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => hasNextPage && handleClick(currentPage + 1, e)}
            isActive={hasNextPage}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationComp;
