import { createApp } from "vue";
import { createWebHistory, createRouter } from "vue-router";

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

createApp(App).use(router).mount("#app");
