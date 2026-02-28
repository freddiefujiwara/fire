import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

vi.mock("@/stores/ui", () => ({ useUiStore: () => ({ privacyMode: false, togglePrivacy: vi.fn() }) }));

import { useAppShellViewModel } from "@/features/app/useAppShellViewModel";

describe("useAppShellViewModel", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("exposes header actions", () => {
    const vm = useAppShellViewModel();
    expect(vm.themeLabel.value).toBe("ライト");
    expect(typeof vm.toggleTheme).toBe("function");
    expect(typeof vm.togglePrivacy).toBe("function");
  });


  it("writes toggled value into fire-theme", async () => {
    const vm = useAppShellViewModel();

    vm.toggleTheme();
    await nextTick();

    expect(localStorage.getItem("fire-theme")).toBe("light");
  });
});
