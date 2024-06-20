<template>
  <div>
    <figure v-for="item in items" :key="item">
      <img :alt="item" :src="getImageUrl(item)" />
      <figcaption>{{ item }}</figcaption>
    </figure>
  </div>
</template>

<script setup>
const items = [
  "Die größten Bahnhöfe",
  "Die ältesten Museen",
  "Die am wenigsten kompakten Kirchen",
  "Die detailliertesten Gebäude",
  "Die detailliertesten Ruinen",
  "Die größten Gebäude mit 10 Punkten",
  "Die größten Gebäude mit 100 Punkten",
  "Die größten Gebäude mit 1000 Punkten",
  "Die größten Gebäude vor 1900",
  "Die größten Gebäude",
  "Die größten Hotels",
  "Die größten Industriebauten",
  "Die größten Kirchen",
  "Die größten Krankenhäuser",
  "Die größten Parkhäuser in Deutschland",
  "Die größten Schulen",
  "Die größten Wohnhäuser aus den 1930ern",
  "Die größten Wohnhäuser aus den 1960ern",
  "Die größten Wohnhäuser aus den 1990ern",
  "Die höchsten Gebäude gebaut vor 1800",
  "Die höchsten Gebäude von Paris",
  "Die höchsten Gebäude von Wien",
  "Die höchsten Gebäude",
  "Die höchsten Kirchen",
  "Die kleinsten Gebäude",
  "Die kompaktesten Bauten",
];
function getImageUrl(item) {
  return new URL(`./assets/top-ten/${item}.svg`, import.meta.url).href;
}
</script>

<style lang="scss" scoped>
figure {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  margin: 0;
  border-bottom: 50px solid silver;
}
img {
  box-sizing: border-box;
  padding: 1em;
  height: 90vh;
  width: 100%;
  object-fit: contain;
}
figcaption {
  text-align: center;
  margin-bottom: 2em;
}
</style>
