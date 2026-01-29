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

const PaginationComp = ({ pages, currentPage, onPageChange }: Props) => {
  const visiblePages = getVisiblePages(pages, currentPage);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={() => currentPage > 1 && onPageChange?.(currentPage - 1)}
          />
        </PaginationItem>

        {visiblePages[0] > 1 && (
          <>
            <PaginationItem>
              <PaginationLink href="#" onClick={() => onPageChange?.(1)}>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationEllipsis />
          </>
        )}

        {visiblePages.map((page) => (
          <PaginationItem key={page}>
            <PaginationLink
              href="#"
              isActive={currentPage === page}
              onClick={() => onPageChange?.(page)}
            >
              {page}
            </PaginationLink>
          </PaginationItem>
        ))}

        {visiblePages.at(-1)! < pages && (
          <>
            <PaginationEllipsis />
            <PaginationItem>
              <PaginationLink href="#" onClick={() => onPageChange?.(pages)}>
                {pages}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={() =>
              currentPage < pages && onPageChange?.(currentPage + 1)
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PaginationComp;
