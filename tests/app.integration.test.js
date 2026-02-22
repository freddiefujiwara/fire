import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createRouter, createWebHashHistory } from "vue-router";
import { defineComponent, reactive, nextTick } from "vue";
import App from "@/App.vue";

let portfolioStore;
let uiStore;
let fetchPortfolioMock;

vi.mock("@/stores/portfolio", () => ({
  usePortfolioStore: () => portfolioStore,
}));

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
    fetchPortfolioMock = vi.fn();
    portfolioStore = reactive({
      data: null,
      loading: false,
      error: "",
      source: "",
      fetchPortfolio: fetchPortfolioMock,
    });

    uiStore = reactive({
      privacyMode: false,
      togglePrivacy: vi.fn(),
      theme: "light",
      toggleTheme: vi.fn(),
    });

    localStorage.clear();
  });

  it("renders fire simulator directly without login gate", async () => {
    const router = makeRouter("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("FIRE Simulator");
    expect(wrapper.text()).toContain("fire-view");
    expect(wrapper.text()).not.toContain("Googleログインが必要です");
  });
});
