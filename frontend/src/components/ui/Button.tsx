interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: string;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  disabled,
  className = "",
  ...rest
}: ButtonProps) {
  const sizeClass =
    size === "sm"
      ? "px-4 py-2 text-sm"
      : size === "lg"
        ? "px-5 py-2.5 text-sm"
        : "px-4 py-2 text-sm";

  const variantClass =
    variant === "primary"
      ? "bg-primary text-white shadow-sm hover:opacity-90"
      : variant === "success"
        ? "bg-[#2f9e63] text-white shadow-sm hover:opacity-90"
        : variant === "danger"
          ? "bg-[#dc2626] text-white shadow-sm hover:opacity-90"
          : variant === "ghost"
            ? "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            : "bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300";

  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-[var(--space-2)] rounded-lg font-medium whitespace-nowrap no-underline leading-none transition-[transform,box-shadow,opacity,background] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary",
        sizeClass,
        variantClass,
        (disabled || loading) ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer",
        "active:scale-[0.97]",
        className,
      ].join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <span
          className={[
            "inline-block w-3.5 h-3.5 rounded-full border-2 animate-spin",
            variant === "secondary" || variant === "ghost"
              ? "border-[var(--color-border-default)] border-t-[var(--color-brand-500)]"
              : "border-white/40 border-t-white",
          ].join(" ")}
          aria-hidden="true"
        />
      ) : icon ? (
        <i className={icon} aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
