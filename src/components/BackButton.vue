<template>
  <div>
    <RouterLink to="/" class="back" title="Back to home">
      <img src="../assets/left-arrow.svg" />
    </RouterLink>
  </div>
</template>

<script setup>
import { RouterLink } from "vue-router";
</script>

<style lang="scss" scoped>
.back {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  box-sizing: border-box;
  width: 2em;
  height: 2em;
  padding: 0.2em;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  img {
    width: 100%;
    height: auto;
  }
}
</style>
