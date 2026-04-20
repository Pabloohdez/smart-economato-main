import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import type { Producto } from "../../services/productosService";
import UiSelect from "../ui/UiSelect";
import { actualizarProducto } from "../../services/productosService";
import { queryKeys } from "../../lib/queryClient";
import { showConfirm, showNotification } from "../../utils/notifications";
import type { LoteProducto } from "../../services/lotesService";
import { ArrowUpDown, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

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

function scrollPageTop() {
  if (typeof window === "undefined") {
    return;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
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
  const pageItems = buildPageItems(safePage, totalPages);
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);
  const visibleIds = useMemo(() => visibleRows.map(({ p }) => String(p.id)), [visibleRows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !allVisibleSelected;

  const caducados = rows.filter((row) => row.cadDias != null && row.cadDias < 0).length;
  const stockBajoCount = rows.filter((row) => row.stock <= row.min).length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => String(row.p.id) === id)));
  }, [rows]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  function changePage(nextPage: number) {
    setPage(nextPage);
    tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function changePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setPage(1);
    tableSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      <section ref={tableSectionRef} className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_20px_50px_rgba(15,23,42,0.07)]">
      <div className="w-full overflow-x-auto bg-white">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`inventario-page-${safePage}-${pageSize}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Table className="min-w-[1080px] overflow-hidden bg-white">
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="w-12 px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleVisibleSelection}
                      aria-label="Seleccionar productos visibles"
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">
                    <span className="inline-flex items-center gap-1.5">
                      Producto
                      <ArrowUpDown className="h-3 w-3 opacity-40" strokeWidth={1.8} />
                    </span>
                  </TableHead>
                  <TableHead className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Categoría</TableHead>
                  <TableHead className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Precio</TableHead>
                  <TableHead className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Stock</TableHead>
                  <TableHead className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Caducidad</TableHead>
                  <TableHead className="px-4 py-3.5 text-left text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Proveedor</TableHead>
                  <TableHead className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.13em] text-slate-400/80">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody variants={paginatedBodyVariants} initial="hidden" animate="visible" exit="exit">
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                    No hay productos para mostrar.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map(({ p, stock, min, cadDias, lotesCount, cadNearest }) => {
                const stockBajo = stock <= min;
                const nearestLabel = labelCaducidad(cadDias, cadNearest);
                const stockUnit = String((p as any).unidadMedida ?? "ud").toLowerCase() || "ud";

                return (
                  <motion.tr
                    key={String(p.id)}
                    variants={paginatedRowVariants}
                  className="group border-b border-slate-100/60 bg-white transition-colors duration-100 last:border-b-0 hover:bg-slate-50/70"
                  >
                    <TableCell className="py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(String(p.id))}
                        onChange={() => toggleRowSelection(String(p.id))}
                        aria-label={`Seleccionar ${String(p.nombre ?? "producto")}`}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="min-w-0">
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-semibold tracking-[-0.01em] text-slate-950">{String(p.nombre ?? "—")}</div>
                          <div className="mt-1 flex flex-col gap-0.5 text-[11px] font-medium text-slate-400">
                            <span>#{String(p.id ?? "—")}</span>
                            <span>{String((p as any).marca ?? "—")}</span>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-[13px] text-slate-700">
                      {String(p.categoria?.nombre ?? "General")}
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-bold tracking-[-0.02em] text-slate-900">{formatMoney(Number(p.precio ?? 0))}</span>
                        <span className="text-[11px] text-slate-400">/{String((p as any).unidadMedida ?? "ud")}</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${stockBajo ? "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]" : "bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.13)]"}`} />
                        <div className="flex flex-col leading-tight">
                          <span className={`text-[13px] font-semibold ${stockBajo ? "text-amber-700" : "text-slate-700"}`}>{stock} {stockUnit}</span>
                          {stockBajo && <span className="text-[11px] font-medium text-amber-500/80">Bajo mínimo</span>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={cadDias != null && cadDias < 0 ? "destructive" : cadDias != null && cadDias <= 30 ? "warning" : "outline"} className="px-3 py-1 text-[11px] font-semibold">
                          {nearestLabel.title}
                        </Badge>
                        {nearestLabel.subtitle ? (
                          <span className="text-[11px] font-medium text-slate-400">{nearestLabel.subtitle}</span>
                        ) : null}
                        <button
                          type="button"
                          className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors hover:text-primary"
                          onClick={() => abrirLotes(p)}
                          title="Ver lotes"
                        >
                          <CalendarDays className="h-3.5 w-3.5" /> {lotesCount} lote(s)
                        </button>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-[13px] text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-700">{String(p.proveedor?.nombre ?? "Sin proveedor")}</span>
                        <span className="text-[11px] text-slate-400">Catálogo</span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <button
                          type="button"
                          title="Editar producto"
                          className="bo-table-action-btn text-[var(--color-brand-500)] hover:bg-[rgba(179,49,49,0.06)] hover:text-[var(--color-brand-600)]"
                          onClick={() => abrirEdicion(p)}
                        >
                          <Pencil className="h-[18px] w-[18px]" strokeWidth={1.5} />
                        </button>
                        <button
                          type="button"
                          title="Eliminar producto"
                          className="bo-table-action-btn text-red-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => void eliminarProducto(p)}
                        >
                          <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.7} />
                        </button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
                })
              )}
              </motion.tbody>
            </Table>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/30 px-5 py-4 text-sm text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span>Mostrando</span>
          <div className="w-[72px]">
            <UiSelect
              value={String(pageSize)}
              onChange={(next) => changePageSize(Number(next))}
              ariaLabel="Cantidad por página"
              options={[10, 25, 50, 100].map((size) => ({ value: String(size), label: String(size) }))}
            />
          </div>
          <span>de {rows.length} productos</span>
          {stockBajoCount > 0 ? (
            <Badge variant="warning" className="px-3 py-1 text-[11px] font-semibold">
              {stockBajoCount} stock bajo
            </Badge>
          ) : null}
          {caducados > 0 ? (
            <Badge variant="destructive" className="px-3 py-1 text-[11px] font-semibold">
              {caducados} caducado(s)
            </Badge>
          ) : null}
        </div>

        <div className="inline-flex flex-wrap items-center gap-1" aria-label="Paginación de inventario">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[13px] text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changePage(1)}
            disabled={safePage <= 1}
          >
            «
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[13px] text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changePage(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
          >
            ‹
          </button>

          {pageItems.map((item, index) =>
            item === "dots" ? (
              <span key={`dots-${index}`} className="inline-flex h-8 w-8 items-center justify-center text-[13px] text-slate-300">···</span>
            ) : (
              <button
                type="button"
                key={item}
                className={item === safePage
                  ? "inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-brand-500)] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(179,49,49,0.25)]"
                  : "inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"}
                onClick={() => changePage(item)}
                aria-current={item === safePage ? "page" : undefined}
              >
                {item}
              </button>
            ),
          )}

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[13px] text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changePage(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
          >
            ›
          </button>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-[13px] text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => changePage(totalPages)}
            disabled={safePage >= totalPages}
          >
            »
          </button>
        </div>
      </div>
      </section>

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