import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import FireSimulator from "./views/FireSimulator.vue";
import "./style.css";

const router = createRouter({
  history: createWebHistory("/fire/"),
  routes: [
    { path: "/:p?", component: FireSimulator, name: "home" },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
