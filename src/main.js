import { createApp } from "vue";
import { createWebHistory, createRouter } from "vue-router";
import VueMatomo from "vue-matomo";

import "normalize.css";
import "./style.css";
import App from "./App.vue";

import HomeView from "./HomeView.vue";
import FluidCitiesView from "./FluidCitiesView.vue";
import TopTenView from "./TopTenView.vue";

const routes = [
  { path: "/", component: HomeView },
  { path: "/fluid-cities/", component: FluidCitiesView },
  { path: "/top-ten/", component: TopTenView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

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
