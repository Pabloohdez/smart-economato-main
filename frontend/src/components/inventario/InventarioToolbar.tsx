import type { Categoria, Proveedor } from "../../services/productosService";
import { Clock3, Download, Filter, FilterX, Plus, Tag, TriangleAlert, ScanLine } from "lucide-react";
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
  onExportProducts: () => void;
  onCreateProduct: () => void;

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
  onExportProducts,
  onCreateProduct,
  limpiarFiltros,
}: Props) {
  const activeFilters = Number(Boolean(catId)) + Number(Boolean(provId)) + Number(onlyStockBajo) + Number(Boolean(onlyProximoCaducar));
  const stockValue = onlyStockBajo ? "stock-bajo" : onlyProximoCaducar ? "proximo-caducar" : "todos";

  function handleStockChange(value: string) {
    if (value === "stock-bajo") {
      setOnlyStockBajo(true);
      setOnlyProximoCaducar(false);
      return;
    }
    if (value === "proximo-caducar") {
      setOnlyStockBajo(false);
      setOnlyProximoCaducar(true);
      return;
    }
    setOnlyStockBajo(false);
    setOnlyProximoCaducar(false);
  }

  return (
    <div className="mb-6 space-y-3">
      <div className="rounded-[26px] border border-slate-200/50 bg-white/98 p-3.5 shadow-[0_2px_4px_rgba(15,23,42,0.03),0_20px_48px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] backdrop-blur-xl">
      <div className="grid gap-3 xl:grid-cols-[minmax(420px,1.8fr)_210px_190px_auto_auto] xl:items-center">
        <div className="min-w-0">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por nombre, referencia, marca o material..."
            ariaLabel="Buscar producto por nombre o código"
            className="[&_input]:h-12 [&_input]:rounded-2xl [&_input]:border-slate-200/70 [&_input]:bg-white [&_input]:shadow-none [&_input]:ring-1 [&_input]:ring-slate-200/60 [&_input]:transition-all [&_input]:duration-200 [&_input]:hover:ring-slate-300/80 [&_input]:focus-visible:outline-none [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[rgba(179,49,49,0.18)] [&_input]:focus-visible:border-[rgba(179,49,49,0.3)]"
          />
        </div>

        <div className="min-w-0">
          <UiSelect
            className="[&>button]:h-12 [&>button]:rounded-2xl [&>button]:border-slate-200/70 [&>button]:bg-white [&>button]:ring-1 [&>button]:ring-black/[0.03] [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:border-slate-300 [&>button]:hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)]"
            leadingIcon={<Filter className="h-4 w-4" />}
            value={catId}
            onChange={setCatId}
            placeholder="Familias (Todas)"
            options={[
              { value: "", label: "Familias  (Todas)" },
              ...cats.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </div>

        <div className="min-w-0">
          <UiSelect
            className="[&>button]:h-12 [&>button]:rounded-2xl [&>button]:border-slate-200/70 [&>button]:bg-white [&>button]:ring-1 [&>button]:ring-black/[0.03] [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:border-slate-300 [&>button]:hover:shadow-[0_6px_18px_rgba(15,23,42,0.07)]"
            leadingIcon={<Filter className="h-4 w-4" />}
            value={stockValue}
            onChange={handleStockChange}
            placeholder="Stock (Todos)"
            options={[
              { value: "todos", label: "Stock  (Todos)" },
              { value: "stock-bajo", label: "Solo stock bajo" },
              { value: "proximo-caducar", label: "Próximo a caducar" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 xl:justify-end">
          <button
            className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200/70 bg-white text-slate-400 ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:text-slate-600 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            type="button"
            onClick={onScanBarcode}
            aria-label="Escanear codigo de barras"
            title="Escanear código"
          >
            <ScanLine className="h-4 w-4" />
          </button>
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 text-[13px] font-medium text-slate-500 ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:text-slate-700 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            type="button"
            onClick={onExportProducts}
          >
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
          <button
            className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 text-[13px] font-medium text-slate-500 ring-1 ring-black/[0.03] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:text-slate-700 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            type="button"
            onClick={limpiarFiltros}
          >
            <FilterX className="h-3.5 w-3.5" /> Limpiar
          </button>
        </div>

        <div className="xl:justify-self-end">
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-500)] px-5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.12),0_10px_24px_rgba(179,49,49,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.07] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.14),0_14px_32px_rgba(179,49,49,0.30)] xl:w-auto"
            type="button"
            onClick={onCreateProduct}
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} /> Nuevo Producto
          </button>
        </div>
      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 text-[12px]">
        <div className="min-w-[210px] max-w-[240px] flex-1">
          <UiSelect
            className="[&>button]:h-10 [&>button]:rounded-xl [&>button]:border-slate-200/70 [&>button]:bg-white [&>button]:text-[13px] [&>button]:ring-1 [&>button]:ring-black/[0.03] [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:border-slate-300 [&>button]:hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]"
            leadingIcon={<Filter className="h-3.5 w-3.5" />}
            value={provId}
            onChange={setProvId}
            placeholder="Proveedor (Todos)"
            options={[
              { value: "", label: "Proveedor  (Todos)" },
              ...provs.map((p) => ({ value: String(p.id), label: p.nombre })),
            ]}
          />
        </div>

        <div className="min-w-[210px] max-w-[240px] flex-1">
          <UiSelect
            className="[&>button]:h-10 [&>button]:rounded-xl [&>button]:border-slate-200/70 [&>button]:bg-white [&>button]:text-[13px] [&>button]:ring-1 [&>button]:ring-black/[0.03] [&>button]:transition-all [&>button]:duration-200 [&>button]:hover:border-slate-300 [&>button]:hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]"
            leadingIcon={<Filter className="h-3.5 w-3.5" />}
            value={orden}
            onChange={(v) => setOrden(v as "asc" | "desc")}
            placeholder="Ordenar precio"
            options={[
              { value: "asc", label: "Precio: menor a mayor" },
              { value: "desc", label: "Precio: mayor a menor" },
            ]}
          />
        </div>

        <button
          type="button"
          onClick={() => setOnlyStockBajo(!onlyStockBajo)}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-medium transition-all duration-200 ${
            onlyStockBajo
              ? "border-amber-300/80 bg-amber-50 text-amber-700 shadow-[0_0_0_3px_rgba(251,191,36,0.12)]"
              : "border-slate-200/70 bg-white text-slate-500 ring-1 ring-black/[0.03] hover:border-slate-300 hover:text-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]"
          }`}
        >
          <TriangleAlert className="h-3.5 w-3.5" /> Stock Bajo
        </button>

        <button
          type="button"
          onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
          className={`inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[13px] font-medium transition-all duration-200 ${
            onlyProximoCaducar
              ? "border-[rgba(179,49,49,0.3)] bg-[rgba(179,49,49,0.06)] text-[var(--color-brand-500)] shadow-[0_0_0_3px_rgba(179,49,49,0.08)]"
              : "border-slate-200/70 bg-white text-slate-500 ring-1 ring-black/[0.03] hover:border-slate-300 hover:text-slate-700 hover:shadow-[0_4px_12px_rgba(15,23,42,0.07)]"
          }`}
        >
          <Clock3 className="h-3.5 w-3.5" /> Próximo a Caducar
        </button>

        {activeFilters > 0 ? (
          <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[rgba(179,49,49,0.22)] bg-[rgba(179,49,49,0.07)] px-3.5 text-[12px] font-semibold text-[var(--color-brand-500)] shadow-[0_0_0_3px_rgba(179,49,49,0.06)]">
            <Tag className="h-3 w-3" />
            {activeFilters} filtro(s) activo(s)
          </div>
        ) : null}
      </div>
    </div>
  );
}
