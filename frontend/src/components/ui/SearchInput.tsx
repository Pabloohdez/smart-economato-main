import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

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
    <div className={cn("relative w-full", maxWidthClassName, className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
        <Search className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="bo-input h-12 pl-11"
      />
    </div>
  );
}