<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="card">
    <h2>404 · 页面不存在</h2>
    <p>你访问的页面不存在。</p>
    <RouterLink :to="{ name: 'Profile' }">返回基本信息</RouterLink>
  </section>
</template>
