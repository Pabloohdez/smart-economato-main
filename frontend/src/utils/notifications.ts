// frontend/src/utils/notifications.ts
export type NotificationType = "success" | "error" | "warning" | "info";

/* ================================================================
   TOAST — showNotification
   ================================================================ */
const TOAST_TTL = 4500;

const TOAST_ICONS: Record<NotificationType, string> = {
  success: "fa-solid fa-circle-check",
  error:   "fa-solid fa-circle-xmark",
  warning: "fa-solid fa-triangle-exclamation",
  info:    "fa-solid fa-circle-info",
};

function getToastContainer(): HTMLElement {
  let el = document.getElementById("ui-toast-container");
  if (!el) {
    el = document.createElement("div");
    el.id = "ui-toast-container";
    document.body.appendChild(el);
  }
  return el;
}

function removeToast(el: HTMLElement) {
  el.classList.add("ui-toast--hide");
  setTimeout(() => el.parentNode?.removeChild(el), 320);
}

export function showNotification(message: string, type: NotificationType = "info") {
  const container = getToastContainer();

  const toast = document.createElement("div");
  toast.className = `ui-toast ui-toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");
  toast.innerHTML = `
    <i class="${TOAST_ICONS[type]} ui-toast__icon" aria-hidden="true"></i>
    <span class="ui-toast__msg">${message}</span>
    <button class="ui-toast__close" aria-label="Cerrar">&times;</button>
    <span class="ui-toast__bar" aria-hidden="true"></span>
  `;

  const closeBtn = toast.querySelector(".ui-toast__close") as HTMLButtonElement;
  const timer = setTimeout(() => removeToast(toast), TOAST_TTL);

  closeBtn.addEventListener("click", () => {
    clearTimeout(timer);
    removeToast(toast);
  });

  container.appendChild(toast);
}

/* ================================================================
   CONFIRM DIALOG — showConfirm
   ================================================================ */
export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  icon?: string;
};

export function showConfirm(
  messageOrOptions: string | ConfirmOptions
): Promise<boolean> {
  const opts: ConfirmOptions =
    typeof messageOrOptions === "string"
      ? { message: messageOrOptions }
      : messageOrOptions;

  const {
    title        = "¿Estás seguro?",
    message,
    confirmLabel = "Confirmar",
    cancelLabel  = "Cancelar",
    variant      = "default",
    icon         = "fa-solid fa-circle-question",
  } = opts;

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "ui-confirm-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ui-confirm-title");

    const okClass =
      variant === "danger"
        ? "ui-confirm-btn-ok ui-confirm-btn-ok--danger"
        : "ui-confirm-btn-ok";

    overlay.innerHTML = `
      <div class="ui-confirm-box">
        <div class="ui-confirm-icon">
          <i class="${icon}" aria-hidden="true"></i>
        </div>
        <h3 id="ui-confirm-title" class="ui-confirm-title">${title}</h3>
        <p class="ui-confirm-msg">${message.replace(/\n/g, "<br>")}</p>
        <div class="ui-confirm-actions">
          <button class="ui-confirm-btn-cancel">${cancelLabel}</button>
          <button class="${okClass}">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("ui-confirm--visible"));

    const btnCancel = overlay.querySelector(".ui-confirm-btn-cancel") as HTMLButtonElement;
    const btnOk     = overlay.querySelector(".ui-confirm-btn-ok")     as HTMLButtonElement;
    btnCancel?.focus();

    const close = (result: boolean) => {
      overlay.classList.remove("ui-confirm--visible");
      document.removeEventListener("keydown", handleKey);
      setTimeout(
        () => document.body.contains(overlay) && document.body.removeChild(overlay),
        250
      );
      resolve(result);
    };

    btnCancel.addEventListener("click", () => close(false));
    btnOk.addEventListener("click",     () => close(true));
    overlay.addEventListener("click",   (e) => { if (e.target === overlay) close(false); });

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter")  { e.preventDefault(); close(true); }
    }
    document.addEventListener("keydown", handleKey);
  });
}

/* ================================================================
   ALERT DIALOG — showAlert (reemplaza window.alert)
   ================================================================ */
export function showAlert(
  message: string,
  type: NotificationType = "info",
  title?: string
): Promise<void> {
  const icons: Record<NotificationType, string> = {
    success: "fa-solid fa-circle-check",
    error:   "fa-solid fa-circle-xmark",
    warning: "fa-solid fa-triangle-exclamation",
    info:    "fa-solid fa-circle-info",
  };
  return showConfirm({
    title:        title ?? (type === "error" ? "Error" : type === "success" ? "Éxito" : "Aviso"),
    message,
    icon:         icons[type],
    confirmLabel: "Entendido",
    cancelLabel:  "",
  }).then(() => undefined);
}
