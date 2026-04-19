import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowUpDown, Clock3, FilterX, Tag, TriangleAlert, Truck, ScanLine } from "lucide-react";
import UiSelect from "../ui/UiSelect";
import SearchInput from "../ui/SearchInput";

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
    <div className="mb-8 rounded-[28px] border border-gray-200/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="mb-4 flex items-center gap-3 max-[820px]:flex-col max-[820px]:items-stretch">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Buscar por nombre, referencia, marca o material..."
          ariaLabel="Buscar producto por nombre o código"
        />

        <button
          className="inline-flex h-12 w-12 min-w-12 items-center justify-center rounded-xl border border-gray-200 bg-white text-slate-400 shadow-sm transition-colors duration-150 hover:bg-slate-50 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
          type="button"
          onClick={onScanBarcode}
          aria-label="Escanear codigo de barras"
          title="Escanear codigo"
        >
          <ScanLine className="h-4 w-4" />
        </button>
      </div>

      <div className="grid [grid-template-columns:minmax(0,1.35fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)_auto] gap-3 max-[1100px]:grid-cols-2 max-[768px]:grid-cols-1">
        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5 sr-only">
            <Tag className="h-3.5 w-3.5" /> Categoría
          </label>
          <UiSelect
            value={catId}
            onChange={setCatId}
            placeholder="Familias"
            options={[
              { value: "", label: "Familias  (Todas)" },
              ...cats.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5 sr-only">
            <Truck className="h-3.5 w-3.5" /> Proveedor
          </label>
          <UiSelect
            value={provId}
            onChange={setProvId}
            placeholder="Stock"
            options={[
              { value: "", label: "Stock  (Todos)" },
              ...provs.map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[12px] font-semibold text-[var(--color-text-muted)] uppercase flex items-center gap-1.5 sr-only">
            <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar
          </label>
          <UiSelect
            value={orden}
            onChange={(v) => setOrden(v as "asc" | "desc")}
            options={[
              { value: "asc", label: "Ordenar  Precio ascendente" },
              { value: "desc", label: "Ordenar  Precio descendente" },
            ]}
          />
        </div>

        <div className="flex items-end">
          <button
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:bg-slate-50 max-[1100px]:w-auto max-[768px]:w-full"
            type="button"
            onClick={limpiarFiltros}
          >
            <FilterX className="h-4 w-4" /> Limpiar
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-3 flex-wrap">
        <button
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
            onlyStockBajo
              ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
              : "border-gray-200 bg-slate-50/70 text-slate-700 hover:bg-slate-50"
          } max-[768px]:w-full max-[768px]:justify-center`}
          type="button"
          onClick={() => setOnlyStockBajo(!onlyStockBajo)}
        >
          <TriangleAlert className="h-4 w-4" /> Stock Bajo
        </button>

        <button
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 ${
            onlyProximoCaducar
              ? "border-primary/15 bg-primary/10 text-primary shadow-sm"
              : "border-gray-200 bg-slate-50/70 text-slate-700 hover:bg-slate-50"
          } max-[768px]:w-full max-[768px]:justify-center`}
          type="button"
          onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
        >
          <Clock3 className="h-4 w-4" /> Próximo a Caducar
        </button>
      </div>
    </div>
  );
}
