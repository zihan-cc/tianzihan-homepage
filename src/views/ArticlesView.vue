<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <section class="articles-page" aria-labelledby="articles-heading">
    <h2 id="articles-heading">学习文章</h2>
    <RouterView />
  </section>
</template>

<style scoped>
.articles-page { line-height: 1.8; overflow-wrap: anywhere; }
.articles-page > h2 { margin: 0 0 20px; color: #35495e; font-size: 24px; }
.articles-page :deep(a) { color: #28734f; text-underline-offset: 4px; }
</style>
