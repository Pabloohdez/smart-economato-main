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
            "group bo-select w-full justify-between gap-3",
            active && "border-slate-300 bg-slate-50 text-slate-900 shadow-[0_0_0_4px_rgba(148,163,184,0.12)]",
            !selected && "text-[var(--color-text-muted)]",
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
            <ChevronDown className="h-4 w-4 text-[#94a3b8] transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={8}
            className={cn(
                "z-[99999] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_48px_rgba(15,23,42,0.08),0_12px_36px_rgba(226,232,240,0.55)]",
              contentClassName,
            )}
            onCloseAutoFocus={() => setSearchTerm("")}
          >
            {searchable && options.length > 8 ? (
              <div className="border-b border-slate-200 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder="Buscar opcion..."
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>
            ) : null}
            <SelectPrimitive.Viewport className="max-h-60 w-full overflow-y-auto overflow-x-hidden p-2">
              {visibleOptions.length === 0 ? (
                <div className="px-3 py-2 text-[13px] text-slate-500">Sin resultados</div>
              ) : null}
              {visibleOptions.map((opt) => (
                <SelectPrimitive.Item
                  key={String(opt.value)}
                  value={opt.value === "" ? EMPTY_OPTION_VALUE : opt.value}
                  disabled={opt.disabled}
                  className="relative flex cursor-pointer items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] capitalize text-slate-700 outline-none transition-colors focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-slate-100 data-[state=checked]:font-semibold data-[state=checked]:text-slate-900"
                >
                  <SelectPrimitive.ItemText>
                    <span className="block w-full truncate">{opt.label}</span>
                  </SelectPrimitive.ItemText>
                  <span className="absolute right-3 flex size-4 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-3.5 w-3.5 text-slate-900" />
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

