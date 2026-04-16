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
      ? "px-4 py-2 text-[13px]"
      : size === "lg"
        ? "px-7 py-3.5 text-[15px]"
        : "px-[22px] py-3 text-[14px]";

  const variantClass =
    variant === "primary"
      ? "bg-[linear-gradient(135deg,var(--color-brand-500),var(--color-brand-600))] text-white shadow-[0_4px_14px_rgba(179,49,49,0.28)] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(179,49,49,0.38)]"
      : variant === "success"
        ? "bg-[linear-gradient(135deg,#48bb78,#38a169)] text-white shadow-[0_4px_14px_rgba(56,161,105,0.28)] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(56,161,105,0.38)]"
        : variant === "danger"
          ? "bg-[linear-gradient(135deg,#e53e3e,#c53030)] text-white shadow-[0_4px_14px_rgba(197,48,48,0.28)] hover:brightness-110"
          : variant === "ghost"
            ? "bg-transparent text-[var(--color-text-muted)] px-[var(--space-3)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-text-default)]"
            : "bg-[var(--color-bg-surface)] text-[var(--color-text-default)] border border-[var(--color-border-default)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-bg-soft)] hover:border-[var(--color-border-strong)]";

  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-sm)] font-semibold whitespace-nowrap no-underline leading-none transition-[transform,box-shadow,filter,background] duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand-500)] focus-visible:outline-offset-2",
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
