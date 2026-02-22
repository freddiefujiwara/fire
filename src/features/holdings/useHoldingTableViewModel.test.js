import { reactive } from "vue";
import { describe, expect, it } from "vitest";
import { useHoldingTableViewModel } from "@/features/holdings/useHoldingTableViewModel";

describe("useHoldingTableViewModel", () => {
  it("sorts by 評価額 and formats values", () => {
    const props = reactive({
      rows: [{ 評価額: "200", 銘柄名: "B" }, { 評価額: "100", 銘柄名: "A" }],
      columns: [{ key: "評価額", label: "評価額" }, { key: "銘柄名", label: "銘柄名" }],
      isLiability: false,
    });
    const vm = useHoldingTableViewModel(props);
    vm.toggleSort(props.columns[0]);
    expect(vm.displayedRows.value[0]["評価額"]).toBe("100");
    expect(vm.formatCell(props.columns[0], props.rows[0])).toContain("¥");
  });
});
