import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";

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
    <div ref={wrapRef} className={`ui-select ${className ?? ""}`.trim()}>
      {label && (
        <label htmlFor={id} className="ui-select__label">
          {label}
        </label>
      )}

      <button
        id={id}
        type="button"
        className="ui-select__trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`ui-select__value ${selected ? "" : "ui-select__value--placeholder"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="ui-select__chev" aria-hidden="true">
          <i className="fa-solid fa-chevron-down" />
        </span>
      </button>

      {open && menuPos
        ? createPortal(
            <div
              className="ui-select__menu ui-select__menu--portal"
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
                    className={`ui-select__item ${isSelected ? "is-selected" : ""} ${opt.disabled ? "is-disabled" : ""}`.trim()}
                    onClick={() => choose(opt)}
                    disabled={opt.disabled}
                  >
                    <span className="ui-select__item-label">{opt.label}</span>
                    {isSelected && (
                      <span className="ui-select__item-check" aria-hidden="true">
                        <i className="fa-solid fa-check" />
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

