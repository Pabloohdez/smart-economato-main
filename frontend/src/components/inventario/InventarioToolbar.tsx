import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowDownWideNarrow, ChevronDown, Download, Filter, FilterX, Plus, ScanLine, Search } from "lucide-react";
import { useMemo } from "react";
import ToolbarFilterDropdown from "../ui/ToolbarFilterDropdown";

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
  totalItems: number;
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
  totalItems: _totalItems,
}: Props) {
  const stockMode = useMemo(() => {
    if (onlyStockBajo) return "stock-bajo";
    if (onlyProximoCaducar) return "proximo-caducar";
    return "todos";
  }, [onlyStockBajo, onlyProximoCaducar]);

  const hasActiveFilters = Boolean(q.trim() || catId || provId || onlyStockBajo || onlyProximoCaducar || orden !== "asc");

  function setStockMode(value: "todos" | "stock-bajo" | "proximo-caducar") {
    if (value === "todos") {
      setOnlyStockBajo(false);
      setOnlyProximoCaducar(false);
      return;
    }
    if (value === "stock-bajo") {
      setOnlyStockBajo(true);
      setOnlyProximoCaducar(false);
      return;
    }
    setOnlyStockBajo(false);
    setOnlyProximoCaducar(true);
  }

  // =========================================================================
  // CLASE MAESTRA UNIFICADA PARA TODOS LOS CONTROLES (Borde, sombra, hover)
  // =========================================================================
  const controlClassName = "h-11 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none";
  const secondaryBtnClassName = `${controlClassName} inline-flex items-center justify-center gap-2 active:scale-[0.98]`;
  
  const stockLabel = stockMode === "stock-bajo" ? "Stock bajo" : stockMode === "proximo-caducar" ? "Próximo a caducar" : "Todos";
  const catLabel = cats.find((cat) => String(cat.id) === catId)?.nombre ?? "Todas";
  const provLabel = provs.find((prov) => String(prov.id) === provId)?.nombre ?? "Todos";

  return (
    <div className="mb-4 border-b border-[#e2e8f0] pb-4">
      <div className="grid grid-cols-1 gap-3 min-[1240px]:grid-cols-[minmax(360px,1.8fr)_minmax(220px,0.92fr)_minmax(180px,0.84fr)_minmax(220px,0.95fr)_minmax(190px,0.84fr)] min-[1240px]:items-center">
        
        {/* Buscador: Hereda los mismos bordes y sombras */}
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por nombre, referencia, marca, material..."
            aria-label="Buscar producto por nombre o código"
            className={`${controlClassName} w-full pl-11 pr-4 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-300/40`}
          />
        </div>

        {/* Dropdowns (la clase maestra está dentro del componente ToolbarFilterDropdown) */}
        <ToolbarFilterDropdown
          label="Familias"
          valueLabel={catLabel}
          value={catId}
          active={Boolean(catId)}
          leadingIcon={<Filter className="h-4 w-4" strokeWidth={2} />}
          onChange={setCatId}
          options={[{ value: "", label: "Todas" }, ...cats.map((cat) => ({ value: String(cat.id), label: cat.nombre }))]}
          className="min-w-0"
        />

        <ToolbarFilterDropdown
          label="Stock"
          valueLabel={stockLabel}
          value={stockMode}
          active={stockMode !== "todos"}
          leadingIcon={<Filter className="h-4 w-4" strokeWidth={2} />}
          onChange={(value) => setStockMode(value as "todos" | "stock-bajo" | "proximo-caducar")}
          options={[
            { value: "todos", label: "Todos" },
            { value: "stock-bajo", label: "Stock bajo" },
            { value: "proximo-caducar", label: "Próximo a caducar" },
          ]}
          className="min-w-0"
        />

        <button
          type="button"
          onClick={onExportProducts}
          className={`${secondaryBtnClassName} min-[1240px]:w-auto`}
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          Exportar / Importar
          <ChevronDown className="h-4 w-4 text-slate-500" strokeWidth={2} />
        </button>

        {/* Botón Primario: Usa color corporativo */}
        <button
          type="button"
          onClick={onCreateProduct}
          className="inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-transparent bg-primary text-white px-5 text-[13px] font-semibold shadow-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo Producto
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <ToolbarFilterDropdown
          label="Proveedor"
          valueLabel={provLabel}
          value={provId}
          active={Boolean(provId)}
          leadingIcon={<Filter className="h-4 w-4" strokeWidth={2} />}
          onChange={setProvId}
          options={[{ value: "", label: "Todos" }, ...provs.map((prov) => ({ value: String(prov.id), label: prov.nombre }))]}
          className="min-w-[220px]"
        />

        <button
          type="button"
          onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
          className={secondaryBtnClassName}
          title="Cambiar orden por precio"
        >
          <ArrowDownWideNarrow className="h-4 w-4" strokeWidth={2} />
          {orden === "asc" ? "Precio ascendente" : "Precio descendente"}
        </button>

        <button
          type="button"
          onClick={onScanBarcode}
          aria-label="Escanear codigo de barras"
          title="Escanear código"
          className={secondaryBtnClassName}
        >
          <ScanLine className="h-4 w-4" strokeWidth={2} />
          Escanear
        </button>

        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hasActiveFilters}
          className={`${secondaryBtnClassName} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FilterX className="h-4 w-4" strokeWidth={2} />
          Limpiar
        </button>
      </div>
    </div>
  );
}