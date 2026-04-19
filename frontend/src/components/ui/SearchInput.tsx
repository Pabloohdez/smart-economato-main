import { Search } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
  maxWidthClassName?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  ariaLabel,
  className = "",
  maxWidthClassName = "",
}: SearchInputProps) {
  return (
    <div className={["relative w-full", maxWidthClassName, className].filter(Boolean).join(" ")}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
        <Search className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 pl-11 text-sm text-gray-900 shadow-sm transition-[border-color,box-shadow,transform] duration-150 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
    </div>
  );
}