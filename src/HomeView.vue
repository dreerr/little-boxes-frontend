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

<style lang="scss" scoped>
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
  }
}

.right {
  background: url("./assets/top-ten.jpg") no-repeat center bottom;
  background-size: cover;
  span {
    color: black;
  }
}

.half span {
  font-size: 2em;
  position: relative;
  z-index: 1;
  line-height: 1;
  padding: 0.1em;
}
</style>
