import { reactive } from "vue";
import { describe, expect, it } from "vitest";
import { useCashFlowBarChartViewModel } from "@/features/cashFlow/useCashFlowBarChartViewModel";

describe("useCashFlowBarChartViewModel", () => {
  it("builds bars and line paths", () => {
    const props = reactive({
      data: [
        { month: "2025-01", income: 100, expense: 80, net: 20, fixed: 50, variable: 30, exclude: 0 },
        { month: "2025-02", income: 120, expense: 70, net: 50, fixed: 40, variable: 30, exclude: 0 },
      ],
      showNet: true,
      averages: { fixed: 45, variable: 30 },
    });

    const vm = useCashFlowBarChartViewModel(props);
    expect(vm.bars.value).toHaveLength(2);
    expect(vm.netLinePath.value.startsWith("M ")).toBe(true);
    expect(vm.deviationLinePath.value).toContain("L");
    expect(vm.rightGridLines.value.length).toBeGreaterThan(0);
  });

  it("handles tooltip lifecycle", () => {
    const props = reactive({ data: [], showNet: true, averages: null });
    const vm = useCashFlowBarChartViewModel(props);
    vm.chartContainerRef.value = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 80 }) };

    vm.showTooltip({ clientX: 20, clientY: 20 }, { label: "収入", value: 100 });
    expect(vm.activeTooltip.value.label).toBe("収入");

    vm.hideTooltip({ pointerType: "touch" });
    expect(vm.activeTooltip.value).not.toBeNull();

    vm.hideTooltip({ pointerType: "mouse" });
    expect(vm.activeTooltip.value).toBeNull();
  });
});
