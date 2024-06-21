import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import ogPlugin from "vite-plugin-open-graph";
import vitePluginFaviconsInject from "vite-plugin-favicons-inject";
import viteImagemin from "@vheemstra/vite-plugin-imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import makeAvif from "imagemin-avif";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      vue(),
      svgLoader(),
      vitePluginFaviconsInject("./src/assets/logo.png", {
        appleStartup: false,
        appName: env.VITE_APP_TITLE,
        appDescription: env.VITE_APP_DESCRIPTION,
        developerName: env.VITE_APP_DEV,
        developerURL: env.VITE_APP_DEV_URL,
        lang: env.VITE_APP_LOCALE,
      }),
      ogPlugin({
        basic: {
          url: env.VITE_APP_URL,
          title: env.VITE_APP_TITLE,
          image: env.VITE_APP_IMAGE,
          type: "Website",
          determiner: "auto",
          description: env.VITE_APP_DESCRIPTION,
          locale: env.VITE_APP_LOCALE,
          siteName: env.VITE_APP_TITLE,
        },
        twitter: {
          title: env.VITE_APP_TITLE,
          image: env.VITE_APP_IMAGE,
          description: env.VITE_APP_DESCRIPTION,
        },
      }),
      viteImagemin({
        plugins: {
          jpg: imageminMozjpeg(),
        },
        makeAvif: {
          plugins: {
            jpg: makeAvif(),
          },
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "mapbox-gl": ["mapbox-gl"],
            "matter-js": ["matter-js"],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
