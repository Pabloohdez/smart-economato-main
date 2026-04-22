import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowDownWideNarrow, ChevronDown, Download, FileSpreadsheet, Filter, FilterX, Plus, ScanLine, Search, FileText } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

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
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onCreateProduct: () => void;
  limpiarFiltros: () => void;
  totalItems: number;
};

type DropdownOption = { value: string; label: string };

function DetailsDropdown({
  label,
  value,
  valueLabel,
  options,
  leadingIcon,
  active,
  onChange,
  className,
}: {
  label: string;
  value: string;
  valueLabel: string;
  options: DropdownOption[];
  leadingIcon?: React.ReactNode;
  active?: boolean;
  onChange: (next: string) => void;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (detailsRef.current && !detailsRef.current.contains(target)) {
        detailsRef.current.open = false;
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (detailsRef.current) detailsRef.current.open = false;
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={className}>
      <details ref={detailsRef} className="group relative">
        <summary
          className={[
            "list-none flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50",
            active ? "border-slate-300" : "border-slate-200",
          ].join(" ")}
          aria-label={label}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {leadingIcon ? <span className="text-slate-400">{leadingIcon}</span> : null}
            <span className="truncate">{label} <span className="text-slate-400">({valueLabel})</span></span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform" />
        </summary>

        <div className="absolute z-20 mt-2 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                className={[
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors hover:bg-slate-100",
                  isActive ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-semibold" : "text-slate-700",
                ].join(" ")}
                onClick={() => {
                  onChange(opt.value);
                  if (detailsRef.current) detailsRef.current.open = false;
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

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
  onExportCsv,
  onExportXlsx,
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

  const secondaryBtnClassName = "bo-toolbar-secondary active:scale-[0.98]";
  
  const stockLabel = stockMode === "stock-bajo" ? "Stock bajo" : stockMode === "proximo-caducar" ? "Próximo a caducar" : "Todos";
  const catLabel = cats.find((cat) => String(cat.id) === catId)?.nombre ?? "Todas";
  const provLabel = provs.find((prov) => String(prov.id) === provId)?.nombre ?? "Todos";

  return (
    <div className="mb-4 border-b border-[#e2e8f0] pb-4">
      <div className="grid grid-cols-1 gap-3 min-[1240px]:grid-cols-[minmax(0,1.8fr)_minmax(0,0.92fr)_minmax(0,0.84fr)_minmax(0,0.95fr)_minmax(0,0.84fr)] min-[1240px]:items-center">
        
        {/* Buscador: Hereda los mismos bordes y sombras */}
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar por nombre, referencia, marca, material..."
            aria-label="Buscar producto por nombre o código"
            className="bo-toolbar-input w-full pl-12 placeholder:text-slate-400"
          />
        </div>

        <DetailsDropdown
          label="Familias"
          valueLabel={catLabel}
          value={catId}
          active={Boolean(catId)}
          leadingIcon={<Filter className="h-4 w-4" strokeWidth={2} />}
          onChange={setCatId}
          options={[{ value: "", label: "Todas" }, ...cats.map((cat) => ({ value: String(cat.id), label: cat.nombre }))]}
          className="min-w-0"
        />

        <DetailsDropdown
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

        <DetailsDropdown
          label="Exportar / Importar"
          valueLabel="Opciones"
          value=""
          active={false}
          leadingIcon={<Download className="h-4 w-4" strokeWidth={2} />}
          onChange={(v) => {
            if (v === "csv") onExportCsv();
            if (v === "xlsx") onExportXlsx();
          }}
          options={[
            { value: "csv", label: "Exportar CSV" },
            { value: "xlsx", label: "Exportar XLSX" },
          ]}
          className="min-w-0 w-full"
        />

        {/* Botón Primario: Usa color corporativo */}
        <button
          type="button"
          onClick={onCreateProduct}
          className="bo-toolbar-primary-blue active:scale-[0.98] w-full"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo Producto
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 min-[900px]:grid-cols-[minmax(220px,1.1fr)_minmax(220px,1fr)_minmax(180px,0.9fr)_minmax(160px,0.8fr)] min-[900px]:items-center">
        <DetailsDropdown
          label="Proveedor"
          valueLabel={provLabel}
          value={provId}
          active={Boolean(provId)}
          leadingIcon={<Filter className="h-4 w-4" strokeWidth={2} />}
          onChange={setProvId}
          options={[{ value: "", label: "Todos" }, ...provs.map((prov) => ({ value: String(prov.id), label: prov.nombre }))]}
          className="w-full min-w-0"
        />

        <button
          type="button"
          onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
          className={`${secondaryBtnClassName} w-full`}
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
          className={`${secondaryBtnClassName} w-full`}
        >
          <ScanLine className="h-4 w-4" strokeWidth={2} />
          Escanear
        </button>

        <button
          type="button"
          onClick={limpiarFiltros}
          disabled={!hasActiveFilters}
          className={`${secondaryBtnClassName} w-full disabled:cursor-not-allowed disabled:opacity-50`}
        >
          <FilterX className="h-4 w-4" strokeWidth={2} />
          Limpiar
        </button>
      </div>
    </div>
  );
}