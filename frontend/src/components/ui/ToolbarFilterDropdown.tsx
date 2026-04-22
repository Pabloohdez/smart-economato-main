import { type ReactNode, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
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
  menuClassName?: string;
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
  menuClassName,
  onChange,
}: ToolbarFilterDropdownProps) {
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
    <div className={cn("relative w-full min-w-0 sm:w-auto", className)}>
      <details ref={detailsRef} className="group">
        <summary
          className={cn(
            // CLASES MAESTRAS: Igualadas al resto de botones de la Toolbar
            "list-none flex items-center justify-between gap-3 cursor-pointer h-11 rounded-xl border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 focus:outline-none active:scale-[0.98]",
            active && "border-blue-300 bg-blue-50 text-blue-700"
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            {leadingIcon ? <span className={cn("shrink-0", active ? "text-blue-600" : "text-slate-500")}>{leadingIcon}</span> : null}
            <span className="min-w-0 truncate font-medium text-slate-700">{label}</span>
            <span className="shrink-0 text-slate-500">({valueLabel})</span>
            {active ? <span className="w-2 h-2 rounded-full bg-blue-600" /> : null}
          </div>
          <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform group-open:rotate-180", active ? "text-blue-600" : "text-slate-500")} />
        </summary>

        <div className={cn("absolute z-20 mt-2 w-full min-w-[220px] rounded-xl border border-slate-300 bg-white p-2 shadow-lg space-y-1", menuClassName)}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={(event) => {
                onChange(option.value);
                const details = event.currentTarget.closest("details") as HTMLDetailsElement | null;
                if (details) details.open = false;
              }}
              className={cn(
                "w-full text-left text-[13px] font-medium px-3 py-2 rounded-lg transition-colors",
                option.value === value ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-100 text-slate-700",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}