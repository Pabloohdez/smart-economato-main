import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Producto } from "../../services/productosService";
import TablePagination from "../ui/TablePagination";
import UiSelect from "../ui/UiSelect";
import { actualizarProducto } from "../../services/productosService";
import { queryKeys } from "../../lib/queryClient";
import { showNotification } from "../../utils/notifications";
import type { LoteProducto } from "../../services/lotesService";
import { CalendarDays, Pencil } from "lucide-react";

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

function classBadgePorCaducidad(dias: number | null) {
  if (dias == null) return "bg-slate-100 text-slate-700 border-slate-200";
  if (dias < 0) return "bg-red-600 text-white border-red-600";
  if (dias <= 30) return "bg-amber-50 text-amber-800 border-amber-300";
  return "bg-emerald-50 text-emerald-800 border-emerald-300";
}

function labelCaducidad(dias: number | null, fecha: Date | null) {
  if (dias == null || !fecha) return { title: "Sin fecha", subtitle: "" };
  if (dias < 0) return { title: "Caducado", subtitle: `${Math.abs(dias)} día(s) tarde` };
  if (dias === 0) return { title: "Caduca hoy", subtitle: formatShortDate(fecha) };
  if (dias <= 30) return { title: `En ${dias} día(s)`, subtitle: formatShortDate(fecha) };
  return { title: formatShortDate(fecha), subtitle: `En ${dias} día(s)` };
}

const paginatedBodyVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.16, ease: "easeInOut" },
  },
} as const;

const paginatedRowVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}



export default function InventarioTable({ items, lotes }: { items: Producto[]; lotes: LoteProducto[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [editProducto, setEditProducto] = useState<Producto | null>(null);
  const [editUnidad, setEditUnidad] = useState<"ud" | "kg" | "l">("ud");
  const [editPrecio, setEditPrecio] = useState("0");
  const [editStock, setEditStock] = useState("0");
  const [editStockMin, setEditStockMin] = useState("0");

  const [lotesOpen, setLotesOpen] = useState(false);
  const [lotesProducto, setLotesProducto] = useState<Producto | null>(null);

  function abrirLotes(p: Producto) {
    setLotesProducto(p);
    setLotesOpen(true);
  }

  function cerrarLotes() {
    setLotesOpen(false);
    setLotesProducto(null);
  }

  const actualizarMutation = useMutation({
    mutationFn: async () => {
      if (!editProducto) throw new Error("Sin producto");
      const precio = Number(String(editPrecio).replace(",", "."));
      const stock = Number(String(editStock).replace(",", "."));
      const stockMinimo = Number(String(editStockMin).replace(",", "."));

      if (!Number.isFinite(precio) || precio < 0) throw new Error("Precio inválido");
      if (!Number.isFinite(stock) || stock < 0) throw new Error("Stock inválido");
      if (!Number.isFinite(stockMinimo) || stockMinimo < 0) throw new Error("Stock mínimo inválido");

      const payload: any = {
        // backend espera la mayoría de campos, así que mandamos también los existentes
        nombre: editProducto.nombre,
        precio,
        stock,
        stockMinimo,
        unidadMedida: editUnidad,
        precioUnitario: editUnidad,
        categoriaId: (editProducto as any).categoriaId ?? editProducto.categoria?.id ?? null,
        proveedorId: (editProducto as any).proveedorId ?? editProducto.proveedor?.id ?? null,
        marca: (editProducto as any).marca ?? null,
        codigoBarras: (editProducto as any).codigoBarras ?? null,
        fechaCaducidad: (editProducto as any).fechaCaducidad ?? null,
        descripcion: (editProducto as any).descripcion ?? null,
        imagen: (editProducto as any).imagen ?? null,
        alergenos: (editProducto as any).alergenos ?? [],
        activo: (editProducto as any).activo ?? true,
      };

      return actualizarProducto(editProducto.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      showNotification("Producto actualizado", "success");
      setEditOpen(false);
      setEditProducto(null);
    },
    onError: (e) => {
      console.error(e);
      showNotification(e instanceof Error ? e.message : "Error actualizando producto", "error");
    },
  });

  function abrirEdicion(p: Producto) {
    setEditProducto(p);
    const unidad = String((p as any).unidadMedida ?? "ud").toLowerCase();
    const safeUnidad = (unidad === "kg" || unidad === "l") ? unidad : "ud";
    setEditUnidad(safeUnidad);
    setEditPrecio(String(Number(p.precio ?? 0)));
    setEditStock(String(Number(p.stock ?? 0)));
    setEditStockMin(String(Number((p as any).stockMinimo ?? 0)));
    setEditOpen(true);
  }

  function cerrarEdicion() {
    if (actualizarMutation.isPending) return;
    setEditOpen(false);
    setEditProducto(null);
  }

  const lotesPorProducto = useMemo(() => {
    const map = new Map<string, LoteProducto[]>();
    for (const l of lotes ?? []) {
      const pid = String(l.productoId);
      const arr = map.get(pid) ?? [];
      arr.push(l);
      map.set(pid, arr);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const da = a.fechaCaducidad ? new Date(a.fechaCaducidad).getTime() : Number.POSITIVE_INFINITY;
        const db = b.fechaCaducidad ? new Date(b.fechaCaducidad).getTime() : Number.POSITIVE_INFINITY;
        return da - db;
      });
      map.set(k, arr);
    }
    return map;
  }, [lotes]);

  const rows = useMemo(() => {
    return items.map((p) => {
      const stock = Number(p.stock ?? 0);
      const min = Number((p as any).stockMinimo ?? 0);
      const pid = String(p.id ?? "");
      const lotesP = lotesPorProducto.get(pid) ?? [];
      const cad = lotesP.find((x) => x.fechaCaducidad)?.fechaCaducidad
        ? parseDate(lotesP.find((x) => x.fechaCaducidad)?.fechaCaducidad as any)
        : parseDate((p as any).fechaCaducidad);
      const cadDias = cad ? daysFromNow(cad) : null;
      const alerta = stock <= min || (cadDias != null && cadDias < 0);
      return { p, stock, min, cadDias, alerta, lotesCount: lotesP.length, cadNearest: cad };
    });
  }, [items, lotesPorProducto]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="w-full overflow-x-auto px-3 pb-3">
        <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[14px]">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="rounded-l-2xl border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">ID</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Producto</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Categoría</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Precio</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Stock</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Caducidad</th>
              <th className="border-b border-gray-100 px-4 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Proveedor</th>
              <th className="rounded-r-2xl border-b border-gray-100 px-4 py-4 text-right text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Acciones</th>
            </tr>
          </thead>
        </table>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`inventario-page-${safePage}-${pageSize}`}
            className="overflow-hidden rounded-[24px] border border-gray-100 bg-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <table className="w-full min-w-[960px] border-separate border-spacing-0 text-[14px]">
              <motion.tbody variants={paginatedBodyVariants} initial="hidden" animate="visible" exit="exit">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                    No hay productos para mostrar.
                  </td>
                </tr>
              ) : (
                visibleRows.map(({ p, stock, min, cadDias, lotesCount, cadNearest }) => {
                const stockBajo = stock <= min;

                return (
                  <motion.tr
                    key={String(p.id)}
                    variants={paginatedRowVariants}
                    className="group transition-[background] duration-150 hover:bg-slate-50/70"
                  >
                    <td className="border-b border-gray-100 px-4 py-3 align-middle font-mono text-[13px] text-slate-500">
                      {String(p.id ?? "—")}
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                      <span className="text-[14px] font-semibold text-slate-900">{String(p.nombre ?? "—")}</span>
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle text-[13px] text-slate-600">
                      {String(p.categoria?.nombre ?? "—")}
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                      <span className="text-[14px] font-bold text-slate-900">{formatMoney(Number(p.precio ?? 0))}</span>
                      <span className="ml-1 text-[12px] text-slate-400">/{String((p as any).unidadMedida ?? "ud")}</span>
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${stockBajo ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {stock} {String((p as any).unidadMedida ?? "ud").toLowerCase() || "ud"}
                      </span>
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle">
                      <div className="flex items-center gap-2 flex-wrap">
                        {cadDias == null ? (
                          <span className="text-[13px] text-slate-400">Sin fecha</span>
                        ) : cadDias < 0 ? (
                          <span className="inline-flex animate-pulse items-center rounded-lg bg-red-600 px-3 py-1 text-[11px] font-bold text-white">
                            ⚠ CADUCADO
                          </span>
                        ) : cadDias <= 30 ? (
                          <span className="inline-flex items-center rounded-lg border-2 border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800">
                            ⏰ {cadDias}d
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-600">{cadNearest ? formatShortDate(cadNearest) : "—"}</span>
                        )}
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-primary"
                          onClick={() => abrirLotes(p)}
                          title="Ver lotes"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          {lotesCount} lote(s)
                        </button>
                      </div>
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 align-middle text-[13px] text-slate-600">
                      {String(p.proveedor?.nombre ?? "—")}
                    </td>

                    <td className="border-b border-gray-100 px-4 py-3 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Editar producto"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-400 shadow-sm transition-colors duration-150 hover:bg-slate-50 hover:text-primary"
                          onClick={() => abrirEdicion(p)}
                        >
                          <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
                })
              )}
              </motion.tbody>
            </table>
          </motion.div>
        </AnimatePresence>
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
      <div className="border-t border-gray-100 bg-slate-50/60 px-6 py-4 flex items-center justify-between font-medium text-sm text-gray-600">
        <div>
          Total: <span className="text-primary font-bold">{items.length}</span> productos
        </div>
      </div>

      {editOpen && editProducto && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && cerrarEdicion()}
        >
          <div className="w-full max-w-[560px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white flex items-center justify-between gap-3">
              <div className="font-extrabold text-[16px]">
                Editar producto: {editProducto.nombre}
              </div>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-9 h-9 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/30"
                onClick={cerrarEdicion}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6 grid gap-4">
              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Unidad
                  </label>
                  <UiSelect
                    value={editUnidad}
                    onChange={(v) => setEditUnidad((v as any) || "ud")}
                    options={[
                      { value: "ud", label: "Unidades (ud)" },
                      { value: "kg", label: "Peso (kg)" },
                      { value: "l", label: "Volumen (l)" },
                    ]}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Precio ({editUnidad === "kg" ? "€/kg" : editUnidad === "l" ? "€/l" : "€/ud"})
                  </label>
                  <input
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    type="number"
                    step="0.01"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Stock ({editUnidad})
                  </label>
                  <input
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    type="number"
                    step={editUnidad === "ud" ? "1" : "0.001"}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
                    Stock mínimo ({editUnidad})
                  </label>
                  <input
                    value={editStockMin}
                    onChange={(e) => setEditStockMin(e.target.value)}
                    type="number"
                    step={editUnidad === "ud" ? "1" : "0.001"}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 max-[640px]:flex-col">
                <button
                  type="button"
                  className="min-h-[42px] bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-lg font-semibold text-sm cursor-pointer hover:bg-gray-50 transition-colors max-[640px]:w-full"
                  onClick={cerrarEdicion}
                  disabled={actualizarMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="min-h-[42px] bg-primary text-white border-0 px-6 py-2.5 rounded-lg font-semibold text-sm cursor-pointer shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed max-[640px]:w-full"
                  onClick={() => actualizarMutation.mutate()}
                  disabled={actualizarMutation.isPending}
                >
                  {actualizarMutation.isPending ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lotesOpen && lotesProducto && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && cerrarLotes()}
        >
          <div className="w-full max-w-[720px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_30px_70px_rgba(0,0,0,0.28)] overflow-hidden">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,#0f172a,#111827)] text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/70">Lotes</div>
                <div className="font-extrabold text-[18px] leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                  {lotesProducto.nombre}
                </div>
              </div>
              <button
                type="button"
                className="bg-white/15 border border-white/20 text-white w-10 h-10 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/25"
                onClick={cerrarLotes}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const pid = String(lotesProducto.id ?? "");
                const lotesP = lotesPorProducto.get(pid) ?? [];
                const unidad = String((lotesProducto as any).unidadMedida ?? "ud").toLowerCase() || "ud";
                const total = lotesP.reduce((s, l) => s + Number(l.cantidad || 0), 0);
                const nearest = lotesP.find((l) => l.fechaCaducidad)?.fechaCaducidad ? parseDate(lotesP.find((l) => l.fechaCaducidad)?.fechaCaducidad as any) : null;
                const nearestDias = nearest ? daysFromNow(nearest) : null;
                const nearestLabel = labelCaducidad(nearestDias, nearest);

                return (
                  <>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
                      <div className="flex flex-col gap-1">
                        <div className="text-[13px] text-[var(--color-text-muted)] font-semibold">
                          Total en lotes
                        </div>
                        <div className="text-[22px] font-black text-[var(--color-text-strong)] leading-tight">
                          {total.toFixed(unidad === "ud" ? 0 : 3)} <span className="text-[14px] font-bold text-[var(--color-text-muted)]">{unidad}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-extrabold ${classBadgePorCaducidad(nearestDias)}`}>
                          <i className="fa-solid fa-calendar-days" />
                          <span>{nearestLabel.title}</span>
                        </span>
                        {nearestLabel.subtitle ? (
                          <span className="text-[12px] text-[var(--color-text-muted)] font-semibold">{nearestLabel.subtitle}</span>
                        ) : null}
                      </div>
                    </div>

                    {lotesP.length === 0 ? (
                      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-soft)] p-6 text-center">
                        <div className="text-[42px] opacity-60 mb-2">
                          <i className="fa-solid fa-box-open" />
                        </div>
                        <div className="font-extrabold text-[16px] text-[var(--color-text-strong)]">Este producto no tiene lotes</div>
                        <div className="text-[13px] text-[var(--color-text-muted)] font-semibold mt-1">
                          Los lotes se crean al recepcionar pedidos con caducidad por lote.
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {lotesP.map((l) => {
                          const fecha = l.fechaCaducidad ? parseDate(l.fechaCaducidad) : null;
                          const dias = fecha ? daysFromNow(fecha) : null;
                          const info = labelCaducidad(dias, fecha);
                          const cantidad = Number(l.cantidad || 0);

                          return (
                            <div
                              key={String(l.id)}
                              className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] flex items-center justify-between gap-4"
                            >
                              <div className="min-w-0 flex items-center gap-3">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border ${classBadgePorCaducidad(dias)}`}>
                                  <i className="fa-solid fa-hourglass-half" />
                                </span>
                                <div className="min-w-0">
                                  <div className="font-extrabold text-[14px] text-[var(--color-text-strong)] whitespace-nowrap overflow-hidden text-ellipsis">
                                    {info.title}
                                  </div>
                                  <div className="text-[12px] text-[var(--color-text-muted)] font-semibold">
                                    {fecha ? formatShortDate(fecha) : "Sin fecha de caducidad"}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                                  Cantidad
                                </div>
                                <div className="font-black text-[18px] text-[var(--color-text-strong)] leading-tight whitespace-nowrap">
                                  {cantidad.toFixed(unidad === "ud" ? 0 : 3)}{" "}
                                  <span className="text-[12px] font-extrabold text-[var(--color-text-muted)]">{unidad}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer hover:bg-[var(--color-border-default)]"
                  onClick={cerrarLotes}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}