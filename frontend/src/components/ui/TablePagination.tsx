import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import UiSelect from "./UiSelect";

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
    <div className="bo-table-pagination px-5 py-4 sm:px-6">
      <div className="flex flex-1 flex-wrap items-center gap-4 text-sm text-slate-500">
        <div className="hidden items-center gap-2 lg:flex">
          <span className="font-medium">Filas por página</span>
          <div className="w-24">
            <UiSelect
              value={String(pageSize)}
              onChange={(next) => handlePageSizeChange(Number(next))}
              ariaLabel="Cantidad por página"
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-600">
          <span>{startItem}-{endItem}</span>
          <span className="text-slate-400">de</span>
          <span>{totalItems} {label}</span>
        </div>

        <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
          <span>Página</span>
          <span>{safePage}</span>
          <span className="text-slate-400">de</span>
          <span>{totalPages}</span>
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 flex-wrap" aria-label="Paginación de tabla">
        <button
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={safePage <= 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {pageItems.map((item, index) =>
              item === "dots" ? (
                <span
                  className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400"
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
                      ? "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-sm"
                      : "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-50"
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={() => handlePageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 lg:inline-flex"
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

