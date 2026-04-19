import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type UiSelectOption = { value: string; label: string; disabled?: boolean };

type UiSelectProps = {
  id?: string;
  label?: string;
  value: string;
  options: UiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
};

export default function UiSelect(props: UiSelectProps) {
  const {
    id,
    label,
    value,
    options,
    placeholder = "Seleccionar...",
    disabled,
    className,
    onChange,
  } = props;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number; width: number } | null>(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) ?? null,
    [options, value],
  );

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      const inWrap = Boolean(wrapRef.current && wrapRef.current.contains(t));
      const inMenu = Boolean(menuRef.current && menuRef.current.contains(t));
      if (!inWrap && !inMenu) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setMenuPos({ left: rect.left, top: rect.bottom + 8, width: rect.width });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function choose(next: UiSelectOption) {
    if (next.disabled) return;
    onChange(next.value);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={className ?? ""}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-[12px] font-bold text-[var(--color-text-muted)] tracking-wide uppercase"
        >
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm outline-none cursor-pointer transition-[border-color,box-shadow,transform] duration-150 hover:border-gray-300 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span
          className={`min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left ${
            selected ? "" : "text-[var(--color-text-muted)] opacity-90"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        <span className={`flex-0 text-[#94a3b8] text-[12px] transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} aria-hidden="true">
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {open && menuPos
        ? createPortal(
            <div
              className="z-[99999] rounded-2xl border border-gray-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)] max-h-[280px] overflow-auto p-2"
              role="listbox"
              aria-label={label ?? "selector"}
              ref={menuRef}
              style={{
                position: "fixed",
                left: menuPos.left,
                top: menuPos.top,
                width: menuPos.width,
              }}
              onMouseDown={(e) => {
                // Evita que el click en el portal se interprete como "fuera"
                e.stopPropagation();
              }}
            >
              {options.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={[
                      "w-full flex items-center justify-between gap-2.5 border-0 bg-transparent px-3 py-2.5 rounded-xl text-left cursor-pointer text-[13px] transition-colors",
                      "hover:bg-gray-50",
                      isSelected ? "bg-primary/5 text-primary font-semibold" : "text-gray-700",
                      opt.disabled ? "opacity-50 cursor-not-allowed hover:bg-transparent" : "",
                    ].join(" ").trim()}
                    onClick={() => choose(opt)}
                    disabled={opt.disabled}
                  >
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{opt.label}</span>
                    {isSelected && (
                      <span className="text-primary" aria-hidden="true">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

