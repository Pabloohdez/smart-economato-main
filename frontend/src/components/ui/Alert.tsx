import "./ui.css";

const ICONS: Record<string, string> = {
  error:   "fa-solid fa-circle-exclamation",
  success: "fa-solid fa-circle-check",
  warning: "fa-solid fa-triangle-exclamation",
  info:    "fa-solid fa-circle-info",
};

interface AlertProps {
  type?: "error" | "success" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Alert({ type = "error", title, children, className = "" }: AlertProps) {
  return (
    <div
      className={`ui-alert ui-alert--${type} ${className}`}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <i className={`ui-alert__icon ${ICONS[type]}`} aria-hidden="true" />
      <div className="ui-alert__body">
        {title && <span className="ui-alert__title">{title}</span>}
        <span>{children}</span>
      </div>
    </div>
  );
}
