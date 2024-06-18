<template>
  <div class="container">
    <div
      class="half left"
      :class="{ active: isActive === 'left' }"
      @click="expand('left')"
    >
      <span>Fluid Cities</span>
    </div>
    <div
      class="half right"
      :class="{ active: isActive === 'right' }"
      @click="expand('right')"
    >
      <span>Top Ten</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const isActive = ref(null);

const expand = (side) => {
  isActive.value = side;
};
</script>

<style scoped>
.container {
  display: flex;
  height: 100vh;
}

.half {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  width: 50%; /* Standardmäßig 50% Breite */
}

.left {
  background-color: black;
  color: white;
}

.right {
  background-color: white;
  color: black;
}

.half span {
  font-size: 2em;
  transition: font-size 0.3s ease;
  position: relative;
  z-index: 1;
}

.half:hover span {
  font-size: 2.5em;
}

.half.active {
  width: 100%; /* Bei Aktivierung 100% Breite */
  flex: 1 1 100%;
}

.half:not(.active) {
  /* display: none; Unsichtbar wenn nicht aktiv */
}
</style>
