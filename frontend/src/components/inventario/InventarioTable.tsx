import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Producto } from "../../services/productosService";
import TablePagination from "../ui/TablePagination";
import UiSelect from "../ui/UiSelect";
import { actualizarProducto } from "../../services/productosService";
import { queryKeys } from "../../lib/queryClient";
import { showNotification } from "../../utils/notifications";
import type { LoteProducto } from "../../services/lotesService";

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
              visibleRows.map(({ p, stock, min, cadDias, alerta, lotesCount }) => {
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

                const cadWrap = (
                  <div className="flex flex-col gap-1">
                    <div>{cadNode}</div>
                    {lotesCount > 0 ? (
                      <button
                        type="button"
                        className="text-[12px] font-semibold text-[var(--color-brand-600)] underline underline-offset-2 text-left"
                        onClick={() => abrirLotes(p)}
                      >
                        Ver {lotesCount} lote(s)
                      </button>
                    ) : (
                      <span className="text-[12px] text-[var(--color-text-muted)]">Sin lotes</span>
                    )}
                  </div>
                );

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
                                  ? "bg-[#fff5f5] text-[#c53030] px-3 py-1 rounded-full font-bold border border-[#feb2b2] inline-block animate-pulse"
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
                                className="min-h-10 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-150 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] inline-flex items-center gap-2"
                                onClick={() => abrirLotes(p)}
                              >
                                <i className="fa-solid fa-calendar-days" /> Lotes
                              </button>
                              <button
                                type="button"
                                className="min-h-10 bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-default)] px-4 py-2 rounded-[10px] font-semibold cursor-pointer transition-[background,border-color] duration-150 whitespace-nowrap hover:bg-[var(--color-border-default)] hover:border-[var(--color-border-strong)] inline-flex items-center gap-2"
                                onClick={() => abrirEdicion(p)}
                              >
                                <i className="fa-solid fa-pen" /> Editar
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
          <div className="w-full max-w-[640px] rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-[0_25px_50px_rgba(0,0,0,0.25)] overflow-hidden">
            <div className="px-6 py-5 bg-[linear-gradient(135deg,#2d3748,#111827)] text-white flex items-center justify-between gap-3">
              <div className="font-extrabold text-[16px]">
                Lotes: {lotesProducto.nombre}
              </div>
              <button
                type="button"
                className="bg-white/20 border-0 text-white w-9 h-9 rounded-full cursor-pointer inline-flex items-center justify-center hover:bg-white/30"
                onClick={cerrarLotes}
                aria-label="Cerrar"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="p-6">
              <div className="text-[13px] text-[var(--color-text-muted)] font-semibold mb-4">
                Aquí se muestran los lotes registrados en recepción (caducidad + cantidad).
              </div>

              <div className="border border-[var(--color-border-default)] rounded-[12px] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead className="bg-[var(--color-bg-soft)]">
                    <tr>
                      <th className="text-left px-4 py-3">Caducidad</th>
                      <th className="text-left px-4 py-3">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const pid = String(lotesProducto.id ?? "");
                      const lotesP = lotesPorProducto.get(pid) ?? [];
                      const unidad = String((lotesProducto as any).unidadMedida ?? "ud").toLowerCase() || "ud";
                      if (lotesP.length === 0) {
                        return (
                          <tr>
                            <td colSpan={2} className="px-4 py-4 text-[var(--color-text-muted)]">
                              Este producto no tiene lotes.
                            </td>
                          </tr>
                        );
                      }
                      return lotesP.map((l) => (
                        <tr key={String(l.id)} className="border-t border-[var(--color-border-default)]">
                          <td className="px-4 py-3">
                            {l.fechaCaducidad ? formatShortDate(new Date(l.fechaCaducidad)) : "Sin fecha"}
                          </td>
                          <td className="px-4 py-3">
                            {Number(l.cantidad).toFixed(unidad === "ud" ? 0 : 3)} {unidad}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

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