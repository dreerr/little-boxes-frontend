import { createApp } from "vue";
import { createWebHistory, createRouter } from "vue-router";
import VueMatomoModule from "vue-matomo";

import "normalize.css";
import "./style.css";
import App from "./App.vue";

import HomeView from "./HomeView.vue";
import TopTenView from "./TopTenView.vue";

const routes = [
  { path: "/", component: HomeView },
  // Lazy: keeps MapLibre and Matter out of the home and top-ten pages.
  { path: "/fluid-cities/", component: () => import("./FluidCitiesView.vue") },
  { path: "/top-ten/", component: TopTenView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// vue-matomo is a webpack UMD bundle; with Vite 8's Node-style CJS interop the plugin sits on .default.
const VueMatomo = VueMatomoModule.default ?? VueMatomoModule;

const app = createApp(App);
app.use(router);
app.use(VueMatomo, {
  host: import.meta.env.VITE_MATOMO_URL,
  siteId: parseInt(import.meta.env.VITE_MATOMO_ID),
  router: router,
});

router.isReady().then(() => {
  app.mount("#app");
});
