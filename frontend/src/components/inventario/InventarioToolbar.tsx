import type { Categoria, Proveedor } from "../../services/productosService";
import { ArrowUpDown, ChevronDown, Filter, FilterX, MoreVertical, Plus, ScanLine, Search } from "lucide-react";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";

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

function FilterDropdown({
  label,
  value,
  valueLabel,
  options,
  leadingIcon,
  active,
  onChange,
}: {
  label: string;
  value: string;
  valueLabel: string;
  options: DropdownOption[];
  leadingIcon?: React.ReactNode;
  active?: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={[
            "group flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all cursor-pointer",
            active
              ? "border border-[rgba(179,49,49,0.35)] bg-[rgba(179,49,49,0.08)] text-[var(--color-brand-600)]"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          ].join(" ")}
          aria-label={label}
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            {leadingIcon ? <span className={`flex-shrink-0 ${active ? "text-[var(--color-brand-500)]" : "text-slate-400"}`}>{leadingIcon}</span> : null}
            <span className="min-w-0 truncate text-[13px]">
              {active ? <><span className="opacity-60">{label}:</span> <span className="font-semibold">{valueLabel}</span></> : label}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={opt.value === value ? "bg-[rgba(179,49,49,0.12)] font-semibold text-[var(--color-brand-600)]" : ""}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
    if (value === "todos") { setOnlyStockBajo(false); setOnlyProximoCaducar(false); return; }
    if (value === "stock-bajo") { setOnlyStockBajo(true); setOnlyProximoCaducar(false); return; }
    setOnlyStockBajo(false); setOnlyProximoCaducar(true);
  }

  const stockLabel = stockMode === "stock-bajo" ? "Bajo" : stockMode === "proximo-caducar" ? "Caduca pronto" : "Todos";
  const catLabel = cats.find((cat) => String(cat.id) === catId)?.nombre ?? "Todas";
  const provLabel = provs.find((prov) => String(prov.id) === provId)?.nombre ?? "Todos";

  return (
    <div className="mb-4 border-b border-[#e2e8f0] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Buscador */}
        <div className="relative min-w-[140px] flex-[2]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" strokeWidth={2} />
          <input
            type="text"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar producto"
            className="bo-toolbar-input w-full pl-10 placeholder:text-slate-400"
          />
        </div>

        {/* Filtros */}
        <div className="min-w-[120px] flex-1">
          <FilterDropdown
            label="Familias"
            valueLabel={catLabel}
            value={catId}
            active={Boolean(catId)}
            leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
            onChange={setCatId}
            options={[{ value: "", label: "Todas" }, ...cats.map((cat) => ({ value: String(cat.id), label: cat.nombre }))]}
          />
        </div>

        <div className="min-w-[120px] flex-1">
          <FilterDropdown
            label="Stock"
            valueLabel={stockLabel}
            value={stockMode}
            active={stockMode !== "todos"}
            leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
            onChange={(value) => setStockMode(value as "todos" | "stock-bajo" | "proximo-caducar")}
            options={[
              { value: "todos", label: "Todos" },
              { value: "stock-bajo", label: "Stock bajo" },
              { value: "proximo-caducar", label: "Próximo a caducar" },
            ]}
          />
        </div>

        <div className="min-w-[120px] flex-1">
          <FilterDropdown
            label="Proveedor"
            valueLabel={provLabel}
            value={provId}
            active={Boolean(provId)}
            leadingIcon={<Filter className="h-3.5 w-3.5" strokeWidth={2} />}
            onChange={setProvId}
            options={[{ value: "", label: "Todos" }, ...provs.map((prov) => ({ value: String(prov.id), label: prov.nombre }))]}
          />
        </div>

        {/* Ordenar — icono solo */}
        <button
          type="button"
          onClick={() => setOrden(orden === "asc" ? "desc" : "asc")}
          className="bo-toolbar-secondary flex-shrink-0 px-3"
          title={orden === "asc" ? "Precio ascendente — clic para invertir" : "Precio descendente — clic para invertir"}
          aria-label="Invertir orden por precio"
        >
          <ArrowUpDown className={`h-4 w-4 ${orden !== "asc" ? "text-[var(--color-brand-500)]" : ""}`} strokeWidth={2} />
        </button>

        {/* Nuevo Producto */}
        <button
          type="button"
          onClick={onCreateProduct}
          className="bo-toolbar-primary-blue active:scale-[0.98] flex-shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo Producto
        </button>

        {/* Más acciones */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`bo-toolbar-secondary flex-shrink-0 px-3 relative ${hasActiveFilters ? "border-[rgba(179,49,49,0.35)] text-[var(--color-brand-500)]" : ""}`}
              aria-label="Más acciones"
              title="Más acciones"
            >
              <MoreVertical className="h-4 w-4" strokeWidth={2} />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[var(--color-brand-500)]" aria-hidden="true" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onScanBarcode}>
              <ScanLine className="h-4 w-4" strokeWidth={2} /> Escanear código
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExportCsv}>
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportXlsx}>
              Exportar XLSX
            </DropdownMenuItem>
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={limpiarFiltros} className="text-[var(--color-brand-600)]">
                  <FilterX className="h-4 w-4" strokeWidth={2} /> Limpiar Filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

