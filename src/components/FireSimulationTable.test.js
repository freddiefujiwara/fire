import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import FireSimulationTable from "./FireSimulationTable.vue";
import { useUiStore } from "@/stores/ui";

describe("FireSimulationTable.vue", () => {
  setActivePinia(createPinia());

  const sampleData = [
    {
      age: 45,
      income: 8000000,
      pension: 0,
      expenses: 4000000,
      investmentGain: 1000000,
      withdrawal: 0,
      assets: 50000000,
      cashAssets: 10000000,
      riskAssets: 40000000,
    },
    {
      age: 65,
      income: 0,
      pension: 2000000,
      expenses: 3000000,
      investmentGain: 2000000,
      withdrawal: 1000000,
      assets: 60000000,
      cashAssets: 12000000,
      riskAssets: 48000000,
    },
  ];

  it("renders table rows based on data", () => {
    const wrapper = mount(FireSimulationTable, {
      props: { data: sampleData },
      global: {
        plugins: [createPinia()],
      },
    });

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);

    expect(rows[0].find(".age-cell").text()).toBe("45歳");
    // income + pension = 8,000,000
    expect(rows[0].findAll("td")[1].text()).toContain("8,000,000");

    expect(rows[1].find(".age-cell").text()).toBe("65歳");
    // income + pension = 2,000,000
    expect(rows[1].findAll("td")[1].text()).toContain("2,000,000");
  });

  it("applies is-negative class when withdrawal > 0", () => {
    const wrapper = mount(FireSimulationTable, {
      props: { data: sampleData },
      global: {
        plugins: [createPinia()],
      },
    });
    const rows = wrapper.findAll("tbody tr");

    // First row: withdrawal 0
    expect(rows[0].findAll("td")[4].classes()).not.toContain("is-negative");

    // Second row: withdrawal 1000000
    expect(rows[1].findAll("td")[4].classes()).toContain("is-negative");
  });

  it("updates CSV button title based on privacy mode", async () => {
    const pinia = createPinia();
    const wrapper = mount(FireSimulationTable, {
      props: { data: sampleData },
      global: {
        plugins: [pinia],
      },
    });

    const uiStore = useUiStore();
    const button = wrapper.find(".download-btn");

    expect(button.attributes("title")).toBe("CSVダウンロード / 共有");

    uiStore.privacyMode = true;
    await wrapper.vm.$nextTick();

    expect(button.attributes("title")).toBe("CSVをダウンロードするにはモザイクを解除してください");
  });
});
