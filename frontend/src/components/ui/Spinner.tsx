import "./ui.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function Spinner({ size = "md", label = "Cargando..." }: SpinnerProps) {
  return (
    <div className="ui-spinner-wrap" role="status" aria-label={label}>
      <span className={`ui-spinner ui-spinner--${size}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
