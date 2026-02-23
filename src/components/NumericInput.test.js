import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import NumericInput from "./NumericInput.vue";

describe("NumericInput", () => {
  it("emits update:modelValue on each input by default", async () => {
    const wrapper = mount(NumericInput, {
      props: { modelValue: 0 },
    });

    const input = wrapper.find("input");
    await input.setValue("1234");

    const updates = wrapper.emitted("update:modelValue") ?? [];
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.at(-1)).toEqual([1234]);
  });

  it("emits update:modelValue only on blur when lazy modifier is enabled", async () => {
    const wrapper = mount(NumericInput, {
      props: {
        modelValue: 0,
        modelModifiers: { lazy: true },
      },
    });

    const input = wrapper.find("input");
    await input.setValue("1234");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await input.trigger("blur");

    expect(wrapper.emitted("update:modelValue")).toEqual([[1234]]);
  });
});
