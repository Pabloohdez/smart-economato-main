import "./ui.css";
import Button from "./Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: string };
}

export default function EmptyState({ icon = "fa-solid fa-box-open", title, description, action }: EmptyStateProps) {
  return (
    <div className="ui-empty">
      <i className={`ui-empty__icon ${icon}`} aria-hidden="true" />
      <p className="ui-empty__title">{title}</p>
      {description && <p className="ui-empty__desc">{description}</p>}
      {action && (
        <Button variant="secondary" size="sm" icon={action.icon} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
