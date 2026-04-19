import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PedidoHistorial } from "../../types";
import SearchInput from "../ui/SearchInput";
import TablePagination from "../ui/TablePagination";

const paginatedBodyVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
} as const;

const paginatedRowVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.18, ease: "easeIn" },
  },
} as const;

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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex gap-2.5 items-center flex-wrap">
        <SearchInput
          value={q}
          onChange={(value) => {
            setQ(value);
            setPage(1);
          }}
          placeholder="Buscar..."
          ariaLabel="Buscar pedidos"
          maxWidthClassName="max-w-[320px]"
        />
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr>
              <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">ID</th>
              <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Proveedor</th>
              <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Estado</th>
              <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Total</th>
              <th className="bg-gray-50/50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Acciones</th>
            </tr>
          </thead>
          <AnimatePresence mode="wait" initial={false}>
            <motion.tbody
              key={`pedidos-page-${safePage}-${pageSize}`}
              variants={paginatedBodyVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
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
                  <motion.tr
                    key={String(p.id)}
                    variants={paginatedRowVariants}
                    className="border-b border-gray-100 transition-colors duration-150 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.proveedor_nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.estado}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{Number(p.total ?? 0).toFixed(2)} €</td>
                    <td className="px-4 py-3">
                      {canReceive ? (
                        <button
                          type="button"
                          className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:opacity-90"
                          onClick={() => onIrARecepcion(p.id)}
                        >
                          <ArrowRight className="h-4 w-4" />
                          Ir a Recepción
                        </button>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                          Completado
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
                })
              )}
            </motion.tbody>
          </AnimatePresence>
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
