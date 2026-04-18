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

  return (
    <div className="mt-4 flex items-center justify-between gap-4 flex-wrap rounded-[18px] border border-[var(--color-border-default)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] px-4 py-3 shadow-[var(--shadow-sm)]">
      <div className="inline-flex items-center gap-2 text-[var(--color-text-muted)] text-[14px] font-medium">
        <span>Mostrando</span>
        <select
          className="border border-[var(--color-border-default)] rounded-[12px] py-[9px] px-3 bg-white text-[var(--color-text-default)] font-semibold shadow-[var(--shadow-sm)] transition-[border-color,box-shadow] duration-150 focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.08)] focus:outline-none"
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          aria-label="Cantidad por página"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          de {totalItems} {label}
        </span>
      </div>

      <div className="inline-flex items-center gap-1.5 flex-wrap" aria-label="Paginación de tabla">
        <button
          className="min-w-10 h-10 rounded-[12px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color,box-shadow,transform] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-px"
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
        >
          <ChevronsLeft className="mx-auto h-4 w-4" />
        </button>
        <button
          className="min-w-10 h-10 rounded-[12px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color,box-shadow,transform] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-px"
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft className="mx-auto h-4 w-4" />
        </button>

        <AnimatePresence mode="popLayout" initial={false}>
          {pageItems.map((item, index) =>
            item === "dots" ? (
              <motion.span
                className="px-1.5 text-[var(--color-text-muted)]"
                key={`dots-${index}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                ...
              </motion.span>
            ) : (
              <motion.button
                type="button"
                key={item}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={
                  item === safePage
                    ? "min-w-10 h-10 rounded-[12px] border border-transparent bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white font-semibold cursor-pointer shadow-[0_10px_22px_rgba(179,49,49,0.24)]"
                    : "min-w-10 h-10 rounded-[12px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color,box-shadow,transform] duration-150 hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-px"
                }
                onClick={() => onPageChange(item)}
                aria-current={item === safePage ? "page" : undefined}
              >
                {item}
              </motion.button>
            ),
          )}
        </AnimatePresence>

        <button
          className="min-w-10 h-10 rounded-[12px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color,box-shadow,transform] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-px"
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          <ChevronRight className="mx-auto h-4 w-4" />
        </button>
        <button
          className="min-w-10 h-10 rounded-[12px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color,box-shadow,transform] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] hover:-translate-y-px"
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
        >
          <ChevronsRight className="mx-auto h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
