import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type Props = {
  totalItems: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  label?: string;
};

function scrollPageTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function buildPageItems(current: number, totalPages: number): Array<number | "dots"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  pages.add(current);
  pages.add(Math.max(1, current - 1));
  pages.add(Math.min(totalPages, current + 1));

  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "dots"> = [];
  sorted.forEach((value, index) => {
    if (index > 0) {
      const prev = sorted[index - 1];
      if (value - prev > 1) {
        items.push("dots");
      }
    }
    items.push(value);
  });

  return items;
}

export default function TablePagination({
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  label = "registros",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = buildPageItems(safePage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === safePage) {
      return;
    }

    onPageChange(nextPage);
    scrollPageTop();
  };

  const handlePageSizeChange = (size: number) => {
    onPageSizeChange(size);
    onPageChange(1);
    scrollPageTop();
  };

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap border-t border-gray-100 bg-white px-6 py-4">
      <div className="inline-flex items-center gap-2 text-sm text-gray-500">
        <span>Mostrando</span>
        <select
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          value={pageSize}
          onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          aria-label="Cantidad por página"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>por página</span>
        <span className="font-medium text-gray-700">
          {startItem}-{endItem}
        </span>
        <span>
          de {totalItems} {label}
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 flex-wrap" aria-label="Paginación de tabla">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={safePage <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`pagination-items-${safePage}-${pageSize}-${totalPages}`}
            className="inline-flex items-center gap-1.5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {pageItems.map((item, index) =>
              item === "dots" ? (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                  key={`dots-${index}`}
                >
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={
                    item === safePage
                      ? "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-md"
                      : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-50"
                  }
                  onClick={() => handlePageChange(item)}
                  aria-current={item === safePage ? "page" : undefined}
                >
                  {item}
                </button>
              ),
            )}
          </motion.div>
        </AnimatePresence>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={safePage >= totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
