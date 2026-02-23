import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHashHistory } from "vue-router";
import { defineComponent, reactive } from "vue";
import App from "@/App.vue";

let uiStore;

vi.mock("@/stores/ui", () => ({
  useUiStore: () => uiStore,
}));

function makeRouter(initialPath = "/") {
  const Dummy = (name) => defineComponent({ template: `<div>${name}</div>` });
  const router = createRouter({
    history: createWebHashHistory(),
    routes: [
      { path: "/", component: Dummy("fire-view") },
    ],
  });
  router.push(initialPath);
  return router;
}

describe("App integration", () => {
  beforeEach(() => {
    uiStore = reactive({
      privacyMode: false,
      togglePrivacy: vi.fn(),
      theme: "light",
      toggleTheme: vi.fn(),
    });

    localStorage.clear();
    Object.assign(navigator, {
      share: undefined,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders fire simulator directly", async () => {
    const router = makeRouter("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("FIRE シミュレータ");
    expect(wrapper.text()).toContain("fire-view");
  });

  it("shows a share confirmation dialog before sharing", async () => {
    const router = makeRouter("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    const buttons = wrapper.findAll(".header-buttons .theme-toggle");
    await buttons[2].trigger("click");

    expect(wrapper.text()).toContain("共有前の確認");
    expect(wrapper.text()).toContain("入力値");
    expect(wrapper.text()).toContain("計算結果");
    expect(wrapper.text()).toContain("信頼できる家族や友人");
    expect(wrapper.text()).toContain("ブックマーク等に保存");
  });
});
