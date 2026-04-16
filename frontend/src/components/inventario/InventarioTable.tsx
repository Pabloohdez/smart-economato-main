import { useMemo, useState } from "react";
import type { Producto } from "../../services/productosService";
import TablePagination from "../ui/TablePagination";

function parseDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(String(d).replace(" ", "T"));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function daysFromNow(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("es-ES").format(d);
}

export default function InventarioTable({ items }: { items: Producto[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const rows = useMemo(() => {
    return items.map((p) => {
      const stock = Number(p.stock ?? 0);
      const min = Number((p as any).stockMinimo ?? 0);
      const cad = parseDate((p as any).fechaCaducidad);
      const cadDias = cad ? daysFromNow(cad) : null;
      const alerta = stock <= min || (cadDias != null && cadDias < 0);
      return { p, stock, min, cadDias, alerta };
    });
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  return (
    <div className="bg-[var(--color-bg-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border-default)] overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">ID</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Producto</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Categoría</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Precio</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Stock</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Caducidad</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Proveedor</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-5 px-4 text-[#718096]">
                  No hay productos para mostrar.
                </td>
              </tr>
            ) : (
              visibleRows.map(({ p, stock, min, cadDias, alerta }) => {
                const stockBajo = stock <= min;
                let cadLabel = "—";
                let cadNode: React.ReactNode = <span className="text-[#4a5568] text-[0.95em] font-medium">{cadLabel}</span>;
                if (cadDias != null) {
                  if (cadDias < 0) {
                    cadLabel = "⚠ CADUCADO";
                    cadNode = (
                      <span className="bg-[#c53030] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center animate-pulse">
                        {cadLabel}
                      </span>
                    );
                  } else if (cadDias <= 30) {
                    cadLabel = `⏰ ${cadDias}d`;
                    cadNode = (
                      <span className="bg-[#fffaf0] text-[#c05621] px-3 py-1.5 rounded-lg border-2 border-[#f6ad55] text-[11px] font-bold inline-flex items-center">
                        {cadLabel}
                      </span>
                    );
                  } else {
                    const fecha = new Date(Date.now() + cadDias * 24 * 60 * 60 * 1000);
                    cadLabel = formatShortDate(fecha);
                    cadNode = <span className="text-[#4a5568] text-[0.95em] font-medium">{cadLabel}</span>;
                  }
                }

                return (
                  <tr
                    key={String(p.id)}
                    className="transition-[background] duration-150 hover:bg-[rgba(179,49,49,0.02)]"
                  >
                    {(
                      [
                        String(p.id ?? ""),
                        String(p.nombre ?? "—"),
                        String(p.categoria?.nombre ?? "—"),
                        `${Number(p.precio ?? 0).toFixed(2)} €`,
                        null,
                        null,
                        String(p.proveedor?.nombre ?? "—"),
                      ] as const
                    ).map((value, idx) => {
                      const base = "px-4 py-3 border-b border-[var(--color-border-default)] text-[var(--color-text-default)] align-middle";
                      const alertBg = alerta ? "bg-[#fff5f5]" : "";
                      if (idx === 4) {
                        return (
                          <td key={idx} className={`${base} ${alertBg}`}>
                            <span
                              className={
                                stockBajo
                                  ? "bg-[#fff5f5] text-[#c53030] px-3 py-1 rounded-full font-bold border border-[#feb2b2] inline-block animate-pulse"
                                  : "bg-[#f0fff4] text-[#2f855a] px-3 py-1 rounded-full font-bold inline-block"
                              }
                            >
                              {stock}
                            </span>
                          </td>
                        );
                      }
                      if (idx === 5) {
                        return (
                          <td key={idx} className={`${base} ${alertBg}`}>
                            {cadNode}
                          </td>
                        );
                      }
                      return (
                        <td key={idx} className={`${base} ${alertBg}`}>
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        totalItems={rows.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50, 100]}
        label="productos"
      />
      <div className="px-[var(--space-6)] py-[var(--space-5)] bg-[linear-gradient(135deg,var(--color-bg-soft)_0%,var(--color-border-default)_100%)] border-t-2 border-[var(--color-border-default)] flex items-center justify-between font-semibold max-[768px]:flex-col max-[768px]:gap-2.5 max-[768px]:items-start">
        <div>
          Total productos: <span className="text-[var(--color-brand-500)] text-[18px]">{items.length}</span>
        </div>
      </div>
    </div>
  );
}