import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowUpDown, Clock3, FilterX, Search, Tag, TriangleAlert, Truck, ScanLine } from "lucide-react";
import UiSelect from "../ui/UiSelect";

type Props = {
  q: string;
  setQ: (v: string) => void;

  cats: Categoria[];
  catId: string;
  setCatId: (v: string) => void;

  provs: Proveedor[];
  provId: string;
  setProvId: (v: string) => void;

  orden: "asc" | "desc";
  setOrden: (v: "asc" | "desc") => void;

  onlyStockBajo: boolean;
  setOnlyStockBajo: (v: boolean) => void;

  onlyProximoCaducar: boolean;
  setOnlyProximoCaducar: (v: boolean) => void;

  onScanBarcode: () => void;

  limpiarFiltros: () => void;
};

export default function InventarioToolbar({
  q,
  setQ,
  cats,
  catId,
  setCatId,
  provs,
  provId,
  setProvId,
  orden,
  setOrden,
  onlyStockBajo,
  setOnlyStockBajo,
  onlyProximoCaducar,
  setOnlyProximoCaducar,
  onScanBarcode,
  limpiarFiltros,
}: Props) {
  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-[var(--space-6)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] mb-[var(--space-6)] border border-[var(--color-border-default)]">
      <div className="flex items-center gap-3 relative mb-5 max-[820px]:flex-col max-[820px]:items-stretch">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[15px] pointer-events-none flex items-center max-[820px]:hidden" aria-hidden="true">
          <Search className="h-4 w-4" />
        </span>

        <input
          className="flex-1 py-[var(--space-4)] px-[18px] pl-12 border border-[var(--color-border-default)] rounded-[16px] text-[15px] bg-[var(--color-bg-soft)] transition-[border-color,box-shadow,background] duration-150 focus:bg-[var(--color-bg-surface)] focus:border-[var(--color-brand-500)] focus:shadow-[0_0_0_4px_rgba(179,49,49,0.1)] focus:outline-none box-border"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto por nombre o código..."
          aria-label="Buscar producto por nombre o código"
        />

        <button
          className="w-12 min-w-12 h-12 border border-[var(--color-border-default)] rounded-[16px] bg-[var(--color-bg-surface)] text-[var(--color-brand-500)] inline-flex items-center justify-center cursor-pointer shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-[rgba(179,49,49,0.18)] hover:shadow-[var(--shadow-md)] active:scale-[0.97] focus-visible:outline-[3px] focus-visible:outline-[rgba(179,49,49,0.35)] focus-visible:outline-offset-2"
          type="button"
          onClick={onScanBarcode}
          aria-label="Escanear codigo de barras"
          title="Escanear codigo"
        >
          <ScanLine className="h-4 w-4" />
        </button>
      </div>

      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-5 max-[768px]:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Categoría
          </label>
          <UiSelect
            value={catId}
            onChange={setCatId}
            placeholder="Todas las categorías"
            options={[
              { value: "", label: "Todas las categorías" },
              ...cats.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" /> Proveedor
          </label>
          <UiSelect
            value={provId}
            onChange={setProvId}
            placeholder="Todos los proveedores"
            options={[
              { value: "", label: "Todos los proveedores" },
              ...provs.map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar
          </label>
          <UiSelect
            value={orden}
            onChange={(v) => setOrden(v as "asc" | "desc")}
            options={[
              { value: "asc", label: "Precio: Menor a Mayor" },
              { value: "desc", label: "Precio: Mayor a Menor" },
            ]}
          />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          className={`min-h-11 px-6 py-3 rounded-[14px] font-semibold cursor-pointer transition-[transform,filter,box-shadow] duration-200 inline-flex items-center gap-2 border ${
            onlyStockBajo
              ? "bg-[rgba(179,49,49,0.12)] text-[var(--color-brand-600)] border-[rgba(179,49,49,0.2)] shadow-[var(--shadow-sm)]"
              : "bg-[#fff8f7] text-[var(--color-brand-500)] border-[rgba(179,49,49,0.14)]"
          } hover:-translate-y-0.5 hover:brightness-95 max-[768px]:w-full max-[768px]:justify-center`}
          type="button"
          onClick={() => setOnlyStockBajo(!onlyStockBajo)}
        >
          <TriangleAlert className="h-4 w-4" /> Stock Bajo
        </button>

        <button
          className={`min-h-11 px-6 py-3 rounded-[14px] font-semibold cursor-pointer transition-[transform,filter,box-shadow] duration-200 inline-flex items-center gap-2 border ${
            onlyProximoCaducar
              ? "bg-[rgba(217,119,69,0.14)] text-[var(--color-brand-600)] border-[rgba(217,119,69,0.22)] shadow-[var(--shadow-sm)]"
              : "bg-[#fff7f2] text-[var(--color-brand-600)] border-[rgba(217,119,69,0.18)]"
          } hover:-translate-y-0.5 hover:brightness-95 max-[768px]:w-full max-[768px]:justify-center`}
          type="button"
          onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
        >
          <Clock3 className="h-4 w-4" /> Próximo a Caducar
        </button>

        <button
          className="min-h-11 px-6 py-3 rounded-[14px] font-semibold cursor-pointer transition-[transform,filter,box-shadow] duration-200 inline-flex items-center gap-2 border bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] border-[var(--color-border-default)] hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[var(--shadow-sm)] max-[768px]:w-full max-[768px]:justify-center"
          type="button"
          onClick={limpiarFiltros}
        >
          <FilterX className="h-4 w-4" /> Limpiar Filtros
        </button>
      </div>
    </div>
  );
}
