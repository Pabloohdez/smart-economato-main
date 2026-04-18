import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import type { Producto } from "../../services/productosService";
import TablePagination from "../ui/TablePagination";
import UiSelect from "../ui/UiSelect";
import { actualizarProducto } from "../../services/productosService";
import { queryKeys } from "../../lib/queryClient";
import { showNotification } from "../../utils/notifications";
import type { LoteProducto } from "../../services/lotesService";
import { CalendarDays, Layers3, PackageSearch, PencilLine } from "lucide-react";

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
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--color-border-default)] overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border-default)] px-5 py-4 max-[640px]:flex-col max-[640px]:items-start">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Vista de inventario</div>
          <div className="mt-1 text-[18px] font-bold text-[var(--color-text-strong)]">Stock, caducidad y lotes en una sola tabla</div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(179,49,49,0.14)] bg-[rgba(179,49,49,0.08)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-brand-500)]">
          <PackageSearch className="h-4 w-4" /> {rows.length} producto(s)
        </div>
      </div>

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
              <th className="bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.06em] px-4 py-[14px] border-b-2 border-[var(--color-border-default)] text-right whitespace-nowrap sticky top-0 z-[1]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-5 px-4 text-[#718096]">
                  No hay productos para mostrar.
                </td>
              </tr>
            ) : (
              visibleRows.map(({ p, stock, min, cadDias, alerta, lotesCount }, index) => {
                const stockBajo = stock <= min;
                let cadLabel = "—";
                let cadNode: React.ReactNode = <span className="text-[#4a5568] text-[0.95em] font-medium">{cadLabel}</span>;
                if (cadDias != null) {
                  if (cadDias < 0) {
                    cadLabel = "Caducado";
                    cadNode = (
                      <span className="bg-[#c53030] text-white px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center">
                        {cadLabel}
                      </span>
                    );
                  } else if (cadDias <= 30) {
                    cadLabel = `${cadDias}d`;
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

                const cadWrap = (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center">{cadNode}</span>
                    {lotesCount > 0 ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-soft)] text-[12px] font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-border-default)] transition whitespace-nowrap"
                        onClick={() => abrirLotes(p)}
                        title="Ver lotes"
                      >
                        <Layers3 className="h-3.5 w-3.5" />
                        {lotesCount} lote(s)
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[var(--color-border-default)] bg-white text-[12px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap">
                        <i className="fa-regular fa-circle-dot text-[11px] opacity-70" />
                        Sin lotes
                      </span>
                    )}
                  </div>
                );

                return (
                  <motion.tr
                    key={String(p.id)}
                    className="transition-[background] duration-150 hover:bg-[rgba(179,49,49,0.02)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                  >
                    {(
                      [
                        String(p.id ?? ""),
                        String(p.nombre ?? "—"),
                        String(p.categoria?.nombre ?? "—"),
                        `${Number(p.precio ?? 0).toFixed(2)} €/${String((p as any).unidadMedida ?? "ud").toLowerCase() || "ud"}`,
                        null,
                        null,
                        String(p.proveedor?.nombre ?? "—"),
                        null,
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
                                  ? "bg-[#fff5f5] text-[#c53030] px-3 py-1 rounded-full font-bold border border-[#feb2b2] inline-block"
                                  : "bg-[#f0fff4] text-[#2f855a] px-3 py-1 rounded-full font-bold inline-block"
                              }
                            >
                              {stock} {String((p as any).unidadMedida ?? "ud").toLowerCase() || "ud"}
                            </span>
                          </td>
                        );
                      }
                      if (idx === 5) {
                        return (
                          <td key={idx} className={`${base} ${alertBg}`}>
                            {cadWrap}
                          </td>
                        );
                      }
                      if (idx === 7) {
                        return (
                          <td key={idx} className={`${base} ${alertBg} text-right`}>
                            <div className="inline-flex items-center gap-2 justify-end flex-wrap">
                              <button
                                type="button"
                                className="min-h-10 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border border-[var(--color-border-default)] px-4 py-2 rounded-[12px] font-semibold cursor-pointer transition-[background,border-color,box-shadow] duration-150 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] inline-flex items-center gap-2"
                                onClick={() => abrirLotes(p)}
                              >
                                <CalendarDays className="h-4 w-4" /> Lotes
                              </button>
                              <button
                                type="button"
                                className="min-h-10 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border border-[var(--color-border-default)] px-4 py-2 rounded-[12px] font-semibold cursor-pointer transition-[background,border-color,box-shadow] duration-150 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)] inline-flex items-center gap-2"
                                onClick={() => abrirEdicion(p)}
                              >
                                <PencilLine className="h-4 w-4" /> Editar
                              </button>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={idx} className={`${base} ${alertBg}`}>
                          {value}
                        </td>
                      );
                    })}
                  </motion.tr>
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
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
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
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
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
                    className="w-full px-4 py-3 border-2 border-[var(--color-border-default)] rounded-[10px] bg-white focus:outline-none focus:border-[var(--color-brand-500)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 max-[640px]:flex-col">
                <button
                  type="button"
                  className="min-h-11 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-5 py-2.5 rounded-[10px] font-semibold cursor-pointer hover:bg-[var(--color-border-default)] max-[640px]:w-full"
                  onClick={cerrarEdicion}
                  disabled={actualizarMutation.isPending}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="min-h-11 bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white border-0 px-6 py-2.5 rounded-[10px] font-semibold cursor-pointer shadow-[0_4px_15px_rgba(179,49,49,0.25)] hover:-translate-y-0.5 transition disabled:opacity-60 disabled:cursor-not-allowed max-[640px]:w-full"
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