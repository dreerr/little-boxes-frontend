<template>
  <div class="container">
    <figure v-for="item in items" :key="item">
      <component :is="getSvg(item.en)" />
      <figcaption>
        {{ item.de }} ⋅ <em>{{ item.en }}</em>
      </figcaption>
    </figure>
  </div>
</template>

<script setup>
import { defineAsyncComponent, onUnmounted } from "vue";
import items from "./assets/top-ten/items.json";

function getSvg(item) {
  return defineAsyncComponent(() => import(`./assets/top-ten/${item}.svg`));
}

const interval = setInterval(() => {
  const svgs = document.querySelectorAll("svg");
  svgs.forEach((svg) => {
    const paths = svg.querySelectorAll("path");
    if (paths.length > 0) {
      svg.currentPathIndex = svg.currentPathIndex || 0;

      paths.forEach((path) => path.classList.remove("highlighted"));
      paths[svg.currentPathIndex].classList.add("highlighted");
      svg.currentPathIndex++;
      if (svg.currentPathIndex >= paths.length) {
        svg.currentPathIndex = 0;
      }
    }
  });
}, 500);
onUnmounted(() => clearInterval(interval));
</script>

<style lang="scss" scoped>
.container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
}
figure {
  scroll-snap-align: start;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  margin: 0;
  box-sizing: content-box;
  border-bottom: 50px solid silver;
}
svg {
  padding: 1em;
}
// img {
//   box-sizing: border-box;
//   padding: 1em;
//   height: 90vh;
//   width: 100%;
//   object-fit: contain;
// }
figcaption {
  margin-top: auto;
  text-align: center;
  margin-bottom: 2em;
  padding: 0 1em;
  em {
    white-space: nowrap;
  }
}

:deep(svg) {
  path.highlighted {
    fill: rgba(0, 0, 0, 1);
  }
}
</style>
