import { type ReactNode, useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "../../lib/utils";

const EMPTY_OPTION_VALUE = "__ui_select_empty__";

export type UiSelectOption = { value: string; label: string; disabled?: boolean };

type UiSelectProps = {
  id?: string;
  label?: string;
  ariaLabel?: string;
  value: string;
  options: UiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  leadingIcon?: ReactNode;
  active?: boolean;
  searchable?: boolean;
  onChange: (value: string) => void;
};

export default function UiSelect(props: UiSelectProps) {
  const {
    id,
    label,
    ariaLabel,
    value,
    options,
    placeholder = "Seleccionar...",
    disabled,
    className,
    triggerClassName,
    contentClassName,
    leadingIcon,
    active = false,
    searchable = true,
    onChange,
  } = props;
  const [searchTerm, setSearchTerm] = useState("");

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value],
  );

  const radixValue = value === "" && selected ? EMPTY_OPTION_VALUE : value;

  const visibleOptions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(normalized));
  }, [options, searchTerm]);

  function handleValueChange(nextValue: string) {
    onChange(nextValue === EMPTY_OPTION_VALUE ? "" : nextValue);
  }

  return (
    <div className={cn("min-w-0", className ?? "")}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-[12px] font-bold text-[var(--color-text-muted)] tracking-wide uppercase"
        >
          {label}
        </label>
      )}

      <SelectPrimitive.Root value={radixValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          data-slot="select-trigger"
          id={id}
          aria-label={ariaLabel ?? label ?? placeholder}
          className={cn(
            "group bo-select w-full justify-between gap-3 h-11 rounded-xl border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition-all duration-150 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-20 focus:border-red-500",
            active && "border-red-300 bg-red-50 text-slate-900 shadow-md ring-2 ring-red-500 ring-opacity-20",
            !selected && "text-slate-500",
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            {leadingIcon ? <span className="shrink-0 text-slate-400">{leadingIcon}</span> : null}
            <SelectPrimitive.Value asChild placeholder={placeholder}>
              <span className="min-w-0 flex-1 truncate capitalize">
                {selected ? selected.label : placeholder}
              </span>
            </SelectPrimitive.Value>
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-red-500" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={12}
            className={cn(
              "z-[2147483647] w-[min(92vw,var(--radix-select-trigger-width))] min-w-[min(92vw,220px)] max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.12),0_16px_40px_rgba(15,23,42,0.08)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:duration-100 data-[state=open]:duration-200",
              contentClassName,
            )}
            onCloseAutoFocus={() => setSearchTerm("")}
          >
            {searchable && options.length > 8 ? (
              <div className="border-b border-slate-200 p-2 mb-1">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    autoFocus
                    placeholder="Buscar opcion..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] font-medium text-slate-700 outline-none transition-all duration-150 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500 focus:ring-opacity-20"
                  />
                </div>
              </div>
            ) : null}
            <SelectPrimitive.Viewport className="max-h-[min(320px,calc(100vh-180px))] w-full overflow-y-auto overscroll-contain overflow-x-hidden p-2">
              {visibleOptions.length === 0 ? (
                <div className="px-3 py-2 text-[12px] text-slate-500">Sin resultados</div>
              ) : null}
              {visibleOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={String(opt.value)}
                  value={opt.value === "" ? EMPTY_OPTION_VALUE : opt.value}
                  disabled={opt.disabled}
                  className="relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-[12px] font-medium capitalize text-slate-700 outline-none transition-all duration-150 select-none hover:bg-slate-50 focus:bg-red-50 focus:text-red-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-red-50 data-[state=checked]:font-semibold data-[state=checked]:text-red-700"
                >
                  <SelectPrimitive.ItemText>
                    <span className="block w-full truncate">{opt.label}</span>
                  </SelectPrimitive.ItemText>
                  <span className="absolute right-3 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-red-600 font-bold" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

