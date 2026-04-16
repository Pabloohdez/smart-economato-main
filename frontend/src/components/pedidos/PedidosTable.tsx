import { useMemo, useState } from "react";
import type { PedidoHistorial } from "../../types";
import TablePagination from "../ui/TablePagination";

type Props = {
  pedidos: PedidoHistorial[];
  onIrARecepcion: (id: number | string) => void;
};

export default function PedidosGrid({ pedidos, onIrARecepcion }: Props) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pedidos;
    return pedidos.filter((p) => {
      return (
        String(p.id).toLowerCase().includes(s)
        || String(p.proveedor_nombre ?? "").toLowerCase().includes(s)
        || String(p.estado ?? "").toLowerCase().includes(s)
      );
    });
  }, [pedidos, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visible = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  return (
    <div>
      <div className="flex gap-2.5 items-center mb-2.5 flex-wrap">
        <input
          type="text"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar..."
          aria-label="Buscar pedidos"
          className="w-full max-w-[320px] py-2.5 px-3.5 border border-[var(--color-border-default)] rounded-[10px] bg-[var(--color-bg-soft)] focus:bg-white focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_3px_rgba(179,49,49,0.1)] focus:outline-none"
        />
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">ID</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Proveedor</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Estado</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Total</th>
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-left whitespace-nowrap sticky top-0 z-[1]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-5 px-4 text-[#718096]">
                  No hay pedidos que coincidan.
                </td>
              </tr>
            ) : (
              visible.map((p) => {
                const estado = String(p.estado ?? "").toUpperCase();
                const canReceive = estado === "PENDIENTE" || estado === "INCOMPLETO";
                return (
                  <tr key={String(p.id)} className="transition-[background] duration-150 hover:bg-[rgba(179,49,49,0.02)]">
                    <td className="px-4 py-3 border-b border-[var(--color-border-default)]">{p.id}</td>
                    <td className="px-4 py-3 border-b border-[var(--color-border-default)]">{p.proveedor_nombre}</td>
                    <td className="px-4 py-3 border-b border-[var(--color-border-default)]">{p.estado}</td>
                    <td className="px-4 py-3 border-b border-[var(--color-border-default)]">{Number(p.total ?? 0).toFixed(2)} €</td>
                    <td className="px-4 py-3 border-b border-[var(--color-border-default)]">
                      {canReceive ? (
                        <button
                          type="button"
                          className="min-h-11 bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2.5 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-200 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)]"
                          onClick={() => onIrARecepcion(p.id)}
                        >
                          Ir a Recepción
                        </button>
                      ) : (
                        <span className="inline-block bg-[#c6f6d5] text-[#22543d] px-3 py-1.5 rounded-full font-semibold text-[12px] whitespace-nowrap">
                          Completado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        totalItems={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[10, 25, 50]}
        label="pedidos"
      />
    </div>
  );
}
