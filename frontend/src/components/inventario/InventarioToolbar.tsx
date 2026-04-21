import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowDownWideNarrow, Clock3, Download, Filter, FilterX, Plus, ScanLine, TriangleAlert } from "lucide-react";
import SearchInput from "../ui/SearchInput";
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
  const stockValue = onlyStockBajo ? "stock-bajo" : onlyProximoCaducar ? "proximo-caducar" : "todos";
  const stockLabel = stockValue === "stock-bajo" ? "Stock bajo" : stockValue === "proximo-caducar" ? "Próximo a caducar" : "Todos";
  const ordenLabel = orden === "desc" ? "Mayor a menor" : "Menor a mayor";
  const catLabel = cats.find((cat) => String(cat.id) === catId)?.nombre ?? "Todas";
  const provLabel = provs.find((prov) => String(prov.id) === provId)?.nombre ?? "Todos";
  const hasActiveFilters = Boolean(q.trim() || catId || provId || onlyStockBajo || onlyProximoCaducar || orden !== "asc");

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
    <div className="mb-5 rounded-[28px] border border-slate-300 bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06),0_10px_24px_rgba(226,232,240,0.4)]">
      <div className="grid grid-cols-1 gap-3 min-[1180px]:grid-cols-[minmax(290px,1.45fr)_minmax(128px,0.72fr)_minmax(122px,0.62fr)_minmax(138px,0.72fr)_minmax(158px,0.8fr)_110px_110px_176px] min-[1180px]:items-center">
        <div className="relative min-w-0">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar por nombre, referencia, marca, material..."
            ariaLabel="Buscar producto por nombre o código"
            inputClassName="text-[15px]"
          />
        </div>

        <ToolbarFilterDropdown
          label="Familias"
          valueLabel={catLabel}
          value={catId}
          active={Boolean(catId)}
          leadingIcon={<Filter className="w-4 h-4" />}
          onChange={setCatId}
          options={[{ value: "", label: "Todas" }, ...cats.map((cat) => ({ value: String(cat.id), label: cat.nombre }))]}
          className="min-w-0"
        />

        <ToolbarFilterDropdown
          label="Stock"
          valueLabel={stockLabel}
          value={stockValue}
          active={stockValue !== "todos"}
          leadingIcon={<Filter className="w-4 h-4" />}
          onChange={handleStockChange}
          options={[
            { value: "todos", label: "Todos" },
            { value: "stock-bajo", label: "Stock bajo" },
            { value: "proximo-caducar", label: "Próximo a caducar" },
          ]}
          className="min-w-0"
        />

        <ToolbarFilterDropdown
          label="Proveedor"
          valueLabel={provLabel}
          value={provId}
          active={Boolean(provId)}
          leadingIcon={<Filter className="w-4 h-4" />}
          onChange={setProvId}
          options={[{ value: "", label: "Todos" }, ...provs.map((prov) => ({ value: String(prov.id), label: prov.nombre }))]}
          className="min-w-0"
        />

        <ToolbarFilterDropdown
          label="Precio"
          valueLabel={ordenLabel}
          value={orden}
          active={orden !== "asc"}
          leadingIcon={<ArrowDownWideNarrow className="w-4 h-4" />}
          onChange={(value) => setOrden(value as "asc" | "desc")}
          options={[
            { value: "asc", label: "Menor a mayor" },
            { value: "desc", label: "Mayor a menor" },
          ]}
          className="min-w-0"
        />

        <button type="button" onClick={onExportProducts} className="bo-toolbar-secondary w-full min-[1280px]:w-auto">
          <Download className="h-4 w-4" />
          Exportar
        </button>

        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hasActiveFilters}
          className="bo-toolbar-secondary w-full min-[1280px]:w-auto disabled:cursor-not-allowed disabled:opacity-55"
        >
          <FilterX className="h-4 w-4" />
          Limpiar
        </button>

        <button type="button" onClick={onCreateProduct} className="bo-toolbar-primary w-full justify-center px-6 min-[1180px]:w-auto">
          <Plus className="h-5 w-5" />
          Nuevo Producto
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyStockBajo(!onlyStockBajo)}
            className={`bo-segmented-btn ${onlyStockBajo ? "border-primary bg-primary text-white hover:bg-primary/95" : ""}`}
            aria-pressed={onlyStockBajo}
          >
            <TriangleAlert className="w-4 h-4" />
            Stock Bajo
          </button>

          <button
            type="button"
            onClick={() => setOnlyProximoCaducar(!onlyProximoCaducar)}
            className={`bo-segmented-btn ${onlyProximoCaducar ? "border-primary bg-primary text-white hover:bg-primary/95" : ""}`}
            aria-pressed={onlyProximoCaducar}
          >
            <Clock3 className="w-4 h-4" />
            Próximo a Caducar
          </button>

          <button
            type="button"
            onClick={onScanBarcode}
            aria-label="Escanear codigo de barras"
            title="Escanear código"
            className="bo-segmented-btn"
          >
            <ScanLine className="w-4 h-4" />
            Escanear
          </button>
      </div>
    </div>
  );
}