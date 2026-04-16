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
    <div className="mt-3.5 flex items-center justify-between gap-3.5 flex-wrap">
      <div className="inline-flex items-center gap-2 text-[var(--color-text-muted)] text-[14px]">
        <span>Mostrando</span>
        <select
          className="border border-[var(--color-border-default)] rounded-[10px] py-[7px] px-2.5 bg-white text-[var(--color-text-default)] font-semibold"
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
          className="min-w-9 h-9 rounded-[10px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage <= 1}
        >
          «
        </button>
        <button
          className="min-w-9 h-9 rounded-[10px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          ‹
        </button>

        {pageItems.map((item, index) =>
          item === "dots" ? (
            <span className="px-1.5 text-[var(--color-text-muted)]" key={`dots-${index}`}>
              ...
            </span>
          ) : (
            <button
              type="button"
              key={item}
              className={
                item === safePage
                  ? "min-w-9 h-9 rounded-[10px] border border-transparent bg-[linear-gradient(135deg,var(--color-brand-500)_0%,var(--color-brand-600)_100%)] text-white font-semibold cursor-pointer shadow-[0_6px_16px_rgba(179,49,49,0.25)]"
                  : "min-w-9 h-9 rounded-[10px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color] duration-150 hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
              }
              onClick={() => onPageChange(item)}
              aria-current={item === safePage ? "page" : undefined}
            >
              {item}
            </button>
          ),
        )}

        <button
          className="min-w-9 h-9 rounded-[10px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
        >
          ›
        </button>
        <button
          className="min-w-9 h-9 rounded-[10px] border border-[var(--color-border-default)] bg-white text-[#4a5568] font-semibold cursor-pointer transition-[background,border-color] duration-150 disabled:opacity-45 disabled:cursor-not-allowed hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]"
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage >= totalPages}
        >
          »
        </button>
      </div>
    </div>
  );
}
