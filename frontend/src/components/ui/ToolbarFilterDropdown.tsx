import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "../../lib/utils";

type ToolbarFilterDropdownOption = {
  value: string;
  label: string;
};

type ToolbarFilterDropdownProps = {
  label: string;
  valueLabel: string;
  value: string;
  options: ToolbarFilterDropdownOption[];
  leadingIcon?: ReactNode;
  active?: boolean;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  searchable?: boolean;
  onChange: (value: string) => void;
};

export default function ToolbarFilterDropdown({
  label,
  valueLabel,
  value,
  options,
  leadingIcon,
  active = false,
  className,
  triggerClassName,
  menuClassName,
  searchable = true,
  onChange,
}: ToolbarFilterDropdownProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (detailsRef.current && !detailsRef.current.contains(target)) {
        detailsRef.current.open = false;
        setSearchTerm("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (detailsRef.current) detailsRef.current.open = false;
      setSearchTerm("");
    };

    document.addEventListener("mousedown", handleDocumentMouseDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className={cn("relative w-full min-w-0 sm:w-auto", className)}>
      <details ref={detailsRef} className="group">
        <summary
          className={cn(
            "list-none flex items-center justify-between gap-2.5 cursor-pointer h-11 rounded-xl border bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:bg-slate-50 focus:outline-none active:scale-[0.98]",
            active
              ? "border-red-200 bg-red-50 text-slate-700 hover:bg-red-50"
              : "border-slate-200",
            triggerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {leadingIcon ? (
              <span className={cn("shrink-0 transition-colors duration-150", active ? "text-red-600" : "text-slate-500")}>
                {leadingIcon}
              </span>
            ) : null}
            <span className="min-w-0 truncate font-medium text-slate-700">{label}</span>
            <span className={cn("shrink-0 capitalize transition-colors duration-150", active ? "text-red-600 font-semibold" : "text-slate-500")}>
              ({valueLabel})
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {active ? <span className="h-1.5 w-1.5 rounded-full bg-red-600" /> : null}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-[transform,color] duration-150 group-open:rotate-180",
                active ? "text-red-500" : "text-slate-400",
              )}
            />
          </div>
        </summary>

        <div
          className={cn(
            "absolute z-20 mt-2 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg",
            menuClassName,
          )}
        >
          {searchable ? (
            <div className="mb-1.5 border-b border-slate-100 pb-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => event.stopPropagation()}
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[13px] text-slate-700 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-60 space-y-0.5 overflow-y-auto overflow-x-hidden">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-[13px] text-slate-500">Sin resultados</div>
            ) : null}
            {filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  onChange(option.value);
                  const details = event.currentTarget.closest("details") as HTMLDetailsElement | null;
                  if (details) details.open = false;
                  setSearchTerm("");
                }}
                className={cn(
                  "no-global-button w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors duration-150 focus:outline-none",
                  option.value === value
                    ? "bg-red-50 font-medium text-red-700"
                    : "text-slate-700 hover:text-slate-900",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}