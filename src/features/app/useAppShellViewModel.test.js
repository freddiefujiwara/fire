import { describe, expect, it, vi } from "vitest";

vi.mock("@/stores/ui", () => ({ useUiStore: () => ({ privacyMode: false, togglePrivacy: vi.fn() }) }));

import { useAppShellViewModel } from "@/features/app/useAppShellViewModel";

describe("useAppShellViewModel", () => {
  it("exposes header actions", () => {
    const vm = useAppShellViewModel();
    expect(vm.themeLabel.value).toBe("ライト");
    expect(typeof vm.toggleTheme).toBe("function");
    expect(typeof vm.togglePrivacy).toBe("function");
  });
});
