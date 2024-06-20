<template>
  <nav class="container">
    <RouterLink to="fluid-cities/" class="half left">
      <span>Fluid Cities</span>
    </RouterLink>
    <RouterLink to="top-ten/" class="half right">
      <span>Top Ten</span>
    </RouterLink>
  </nav>
</template>

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
  background: url("./assets/fluid-cities.png") no-repeat left bottom;
  background-size: cover;
  span {
    background-color: white;
    color: black;
    line-height: 1;
    padding: 0.1em;
  }
}

.right {
  background: url("./assets/top-ten.jpg") no-repeat center bottom;
  background-size: cover;
  span {
    color: black;
    line-height: 1;
    padding: 0.1em;
  }
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
