import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FireSimulationChart from "./FireSimulationChart.vue";

describe("FireSimulationChart.vue", () => {
  const sampleData = [
    { age: 44, income: 8000000, pension: 0, expenses: 4000000, withdrawal: 0, assets: 50000000 },
    { age: 65, income: 0, pension: 2000000, expenses: 3000000, withdrawal: 1000000, assets: 60000000 },
  ];

  it("renders SVG with expected paths and bars", () => {
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData },
    });

    expect(wrapper.find("svg").exists()).toBe(true);

    // Check for paths (Expense and Asset lines)
    const paths = wrapper.findAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);

    // Check for bars (Income, Pension, Withdrawal for each data point)
    const rects = wrapper.findAll("rect");
    // 2 data points * 3 types of bars = 6 rects
    expect(rects.length).toBe(6);
  });

  it("handles empty data gracefully", () => {
    const wrapper = mount(FireSimulationChart, {
      props: { data: [] },
    });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.findAll("rect").length).toBe(0);

    // Paths should be empty
    const paths = wrapper.findAll("path");
    paths.forEach(p => {
      expect(p.attributes("d")).toBe("");
    });

    // Check axis labels for empty data (should use fallback steps)
    const labels = wrapper.findAll(".fire-y-axis-label");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("shows tooltip on mouseenter and hides on mouseleave", async () => {
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData },
    });

    const rects = wrapper.findAll("rect");

    // Work Income
    await rects[0].trigger("mouseenter");
    expect(wrapper.find(".tooltip").exists()).toBe(true);
    expect(wrapper.find(".tooltip").text()).toContain("給与収入");
    await rects[0].trigger("mouseleave");
    expect(wrapper.find(".tooltip").exists()).toBe(false);

    // Pension
    await rects[1].trigger("mouseenter");
    expect(wrapper.find(".tooltip").exists()).toBe(true);
    expect(wrapper.find(".tooltip").text()).toContain("年金収入");
    await rects[1].trigger("mouseleave");

    // Withdrawal
    await rects[2].trigger("mouseenter");
    expect(wrapper.find(".tooltip").exists()).toBe(true);
    expect(wrapper.find(".tooltip").text()).toContain("資産取り崩し");
  });

  it("renders axis labels", () => {
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData },
    });

    const labels = wrapper.findAll(".fire-y-axis-label");
    expect(labels.length).toBeGreaterThan(0);
    // Values are roughly in "万" units
    expect(labels[0].text()).toContain("万");
  });

  it("renders annotations and shows event tooltip", async () => {
    const annotations = [{ age: 65, label: "リタイア" }];
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData, annotations },
    });

    // Check for annotation text
    expect(wrapper.text()).toContain("リタイア");

    // Find the transparent hover line
    const lines = wrapper.findAll("line");
    const hoverLines = lines.filter((l) => l.attributes("stroke") === "transparent");
    expect(hoverLines.length).toBe(1);

    // Hover over annotation
    await hoverLines[0].trigger("mouseenter");
    expect(wrapper.find(".tooltip").exists()).toBe(true);
    expect(wrapper.find(".tooltip").text()).toContain("リタイア");
    expect(wrapper.find(".tooltip").text()).toContain("65歳");
    await hoverLines[0].trigger("mouseleave");
    expect(wrapper.find(".tooltip").exists()).toBe(false);
  });

  it("handles annotations with ages not in data", () => {
    const annotations = [{ age: 99, label: "Invalid" }];
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData, annotations },
    });
    // Text "Invalid" should not be present because index is -1
    expect(wrapper.text()).not.toContain("Invalid");
  });

  it("renders Monte Carlo percentile paths when provided", () => {
    const monteCarloPaths = {
      p10Path: [40000000, 45000000],
      p50Path: [50000000, 55000000],
      p90Path: [60000000, 65000000],
    };
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData, monteCarloPaths },
    });

    // p10, p50, p90 paths should be rendered
    const paths = wrapper.findAll("path");
    // Expense, Assets, P10, P50, P90 = 5 paths
    expect(paths.length).toBeGreaterThanOrEqual(5);

    // Verify paths are not empty
    expect(paths[2].attributes("d")).not.toBe("");
    expect(paths[3].attributes("d")).not.toBe("");
    expect(paths[4].attributes("d")).not.toBe("");
  });

  it("handles partial monteCarloPaths props", () => {
    const wrapper = mount(FireSimulationChart, {
      props: { data: sampleData, monteCarloPaths: {} },
    });
    const paths = wrapper.findAll("path");
    // Only Expense and Assets lines
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths[2].attributes("d")).toBe("");
  });
});
