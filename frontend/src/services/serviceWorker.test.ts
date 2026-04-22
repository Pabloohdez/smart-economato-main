import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "./serviceWorker";

describe("serviceWorker", () => {
  it("registra el service worker al cargar la página en producción", async () => {
    const handlers = new Map<string, () => void>();
    const register = vi.fn().mockResolvedValue(undefined);

    registerServiceWorker(
      {
        addEventListener: (event: string, callback: EventListenerOrEventListenerObject) => {
          handlers.set(event, callback as () => void);
        },
      } as unknown as Window,
      {
        serviceWorker: {
          register,
        },
      } as unknown as Navigator,
      true,
    );

    handlers.get("load")?.();
    await Promise.resolve();

    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});