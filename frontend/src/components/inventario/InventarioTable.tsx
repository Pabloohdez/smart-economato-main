import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Producto } from "../../services/productosService";
import UiSelect from "../ui/UiSelect";
import { actualizarProducto } from "../../services/productosService";
import { queryKeys } from "../../lib/queryClient";
import { showConfirm, showNotification } from "../../utils/notifications";
import type { LoteProducto } from "../../services/lotesService";
import { BadgeEuro, Eye, Pencil, Trash2 } from "lucide-react";
import TablePaginationControls from "../ui/TablePaginationControls";
import { cn } from "../../lib/utils";

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

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatStock(stock: number, unit: string) {
  const digits = unit === "ud" ? 0 : 2;
  return `${stock.toFixed(digits)} ${unit}`;
}

function getStockPresentation(stock: number, min: number) {
  if (stock <= 0) {
    return {
      badge: "Agotado",
      badgeClassName: "bg-red-50 text-red-700 border-red-200",
      textClassName: "text-red-600",
    };
  }

  if (stock <= min) {
    return {
      badge: "Stock bajo",
      badgeClassName: "bg-amber-50 text-amber-700 border-amber-200",
      textClassName: "text-amber-700",
    };
  }

  return {
    badge: "En stock",
    badgeClassName: "bg-emerald-50 text-emerald-700 border-emerald-200",
    textClassName: "text-slate-700",
  };
}



export default function InventarioTable({ items, lotes }: { items: Producto[]; lotes: LoteProducto[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const tableSectionRef = useRef<HTMLElement | null>(null);

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

  const eliminarMutation = useMutation({
    mutationFn: async (producto: Producto) => {
      const payload: any = {
        nombre: producto.nombre,
        precio: Number(producto.precio ?? 0),
        stock: Number(producto.stock ?? 0),
        stockMinimo: Number((producto as any).stockMinimo ?? 0),
        unidadMedida: (producto as any).unidadMedida ?? "ud",
        precioUnitario: (producto as any).precioUnitario ?? (producto as any).unidadMedida ?? "ud",
        categoriaId: (producto as any).categoriaId ?? producto.categoria?.id ?? null,
        proveedorId: (producto as any).proveedorId ?? producto.proveedor?.id ?? null,
        marca: (producto as any).marca ?? null,
        codigoBarras: (producto as any).codigoBarras ?? null,
        fechaCaducidad: (producto as any).fechaCaducidad ?? null,
        descripcion: (producto as any).descripcion ?? null,
        imagen: (producto as any).imagen ?? null,
        alergenos: (producto as any).alergenos ?? [],
        activo: false,
      };

      return actualizarProducto(producto.id, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.productos });
      showNotification("Producto eliminado del inventario.", "success");
    },
    onError: (error) => {
      showNotification(error instanceof Error ? error.message : "No se pudo eliminar el producto.", "error");
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
  const visibleIds = useMemo(() => visibleRows.map(({ p }) => String(p.id)), [visibleRows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => String(row.p.id) === id)));
  }, [rows]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function changePage(nextPage: number) {
    setPage(nextPage);
  }

  function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
  }

  function toggleRowSelection(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function toggleVisibleSelection() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  async function eliminarProducto(producto: Producto) {
    const ok = await showConfirm({
      title: "Eliminar producto",
      message: `¿Quieres eliminar ${producto.nombre} del inventario?`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });

    if (!ok) return;
    await eliminarMutation.mutateAsync(producto);
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.35 }}>
        <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white">
          <section ref={tableSectionRef}>
            <div className="overflow-x-auto">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`inventario-page-${safePage}-${pageSize}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  <table className="w-full min-w-[1100px] text-sm bo-table-no-select">
                    <thead className="border-b-2 border-slate-300 bg-gradient-to-r from-slate-50 to-slate-100">
                      <tr className="text-left text-slate-700">
                        <th className="w-10 px-4 py-2.5 align-middle">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            aria-label="Seleccionar todos los productos visibles"
                            checked={allVisibleSelected}
                            onChange={toggleVisibleSelection}
                            onMouseDown={(event) => event.preventDefault()}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </th>
                        <th className="px-4 py-2.5 align-middle text-[15px] font-semibold text-slate-900">Producto</th>
                        <th className="px-4 py-2.5 align-middle text-[15px] font-semibold text-slate-900">Familia</th>
                        <th className="px-4 py-2.5 align-middle text-right text-[15px] font-semibold text-slate-900">Precio</th>
                        <th className="px-4 py-2.5 align-middle text-center text-[15px] font-semibold text-slate-900">Stock</th>
                        <th className="px-4 py-2.5 align-middle text-center text-[15px] font-semibold text-slate-900">Caducidad</th>
                        <th className="px-4 py-2.5 align-middle text-[15px] font-semibold text-slate-900">Proveedor</th>
                        <th className="px-4 py-2.5 align-middle text-center text-[15px] font-semibold text-slate-900">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-10 text-center">
                            <p className="text-gray-500">No hay productos disponibles</p>
                          </td>
                        </tr>
                      ) : (
                        visibleRows.map(({ p, stock, min, cadDias, lotesCount, cadNearest }) => {
                          const nearestLabel = labelCaducidad(cadDias, cadNearest);
                          const stockUnit = String((p as any).unidadMedida ?? "ud").toLowerCase() || "ud";
                          const stockMeta = getStockPresentation(stock, min);
                          const reference = String((p as any).codigoBarras ?? p.id ?? "—");

                          return (
                            <tr
                              key={String(p.id)}
                              className={`bo-table-row last:border-b-0 select-none ${selectedIds.includes(String(p.id)) ? "bg-indigo-50/50" : ""}`}
                            >
                              <td className="px-4 py-1 align-top">
                                <input
                                  type="checkbox"
                                  aria-label={`Seleccionar ${String(p.nombre ?? "producto")}`}
                                  checked={selectedIds.includes(String(p.id))}
                                  onChange={() => toggleRowSelection(String(p.id))}
                                  onMouseDown={(event) => event.preventDefault()}
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-4 py-1 align-top">
                                <div className="min-w-[280px]">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="truncate font-semibold text-slate-800">{String(p.nombre ?? "Sin nombre")}</p>
                                  </div>
                                  <div className="mt-0.5 space-y-0 text-[10px] leading-tight text-slate-500">
                                    <p>#{String(p.id ?? "—")} · Ref. {reference}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-1 align-top text-slate-700">
                                <div className="space-y-0 leading-tight">
                                  <p>{String(p.categoria?.nombre ?? "General")}</p>
                                  <p className="text-[10px] text-slate-500">Unidad: {stockUnit}</p>
                                </div>
                              </td>
                              <td className="px-4 py-1 align-top text-right">
                                <p className="font-bold tabular-nums text-primary">{formatMoney(Number(p.precio ?? 0))}</p>
                                <p className="ml-auto mt-0.5 inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <BadgeEuro className="h-3.5 w-3.5" /> /{stockUnit}
                                </p>
                              </td>
                              <td className="px-4 py-1 align-top text-center">
                                <div className="space-y-0 leading-tight">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0 text-[11px] font-semibold leading-5",
                                    stockMeta.badge === "En stock" ? "bg-green-100 text-green-800" : stockMeta.badge === "Stock bajo" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800",
                                  )}>
                                    {stockMeta.badge}
                                  </span>
                                  <div className="text-[10px] text-slate-500">{formatStock(stock, stockUnit)}</div>
                                </div>
                              </td>
                              <td className="px-4 py-1 align-top text-center">
                                <div className="space-y-0 leading-tight">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2.5 py-0 text-[11px] font-semibold leading-5",
                                    cadDias != null && cadDias < 0 ? "bg-red-100 text-red-800" : cadDias != null && cadDias <= 30 ? "bg-amber-100 text-amber-800" : cadDias == null ? "bg-slate-100 text-slate-800" : "bg-green-100 text-green-800",
                                  )}>
                                    {nearestLabel.title}
                                  </span>
                                  <div className="text-[10px] text-slate-500">{nearestLabel.subtitle || "Sin fecha registrada"}</div>
                                </div>
                              </td>
                              <td className="px-4 py-1 align-top text-slate-700">
                                <div className="space-y-0 text-[10px] leading-tight text-slate-600">
                                  <p>{String(p.proveedor?.nombre ?? "Sin proveedor")}</p>
                                  <p>Lotes: {lotesCount}</p>
                                </div>
                              </td>
                              <td className="px-4 py-1 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => abrirLotes(p)}
                                    className="bo-table-action-btn text-slate-600 hover:text-slate-800"
                                    title="Ver lotes"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => abrirEdicion(p)}
                                    className="bo-table-action-btn text-primary hover:text-primary/90"
                                    title="Editar producto"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void eliminarProducto(p)}
                                    className="bo-table-action-btn text-red-600 hover:text-red-700"
                                    title="Eliminar producto"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </motion.div>
              </AnimatePresence>
            </div>
            {rows.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bo-table-pagination"
              >
                <TablePaginationControls
                  page={safePage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={rows.length}
                  totalLabel="productos"
                  onPageChange={changePage}
                  onPageSizeChange={changePageSize}
                />
              </motion.div>
            ) : null}
          </section>
        </div>
      </motion.div>

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
    </>
  );
}