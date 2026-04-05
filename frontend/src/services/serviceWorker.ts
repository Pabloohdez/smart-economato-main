export function registerServiceWorker(
  currentWindow: Pick<Window, "addEventListener"> | undefined = typeof window !== "undefined" ? window : undefined,
  currentNavigator: (Navigator & { serviceWorker?: ServiceWorkerContainer }) | undefined = typeof navigator !== "undefined" ? navigator : undefined,
  isProd = import.meta.env.PROD,
) {
  if (!currentWindow || !currentNavigator || !("serviceWorker" in currentNavigator) || !isProd) {
    return;
  }

  currentWindow.addEventListener("load", () => {
    void currentNavigator.serviceWorker?.register("/sw.js");
  });
}