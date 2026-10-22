<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <section class="project-center" aria-labelledby="projects-heading">
    <h2 id="projects-heading">项目中心</h2>
    <RouterView />
  </section>
</template>

<style scoped>
.project-center > h2 {
  margin: 0 0 20px;
  font-size: 24px;
  color: #35495e;
}

.project-center :deep(a) {
  color: #35745b;
  text-underline-offset: 4px;
}

.project-center :deep(h3),
.project-center :deep(p),
.project-center :deep(li) {
  overflow-wrap: anywhere;
}
</style>
