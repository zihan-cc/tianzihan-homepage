<script setup>
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'

const { interests } = storeToRefs(useProfileStore())
</script>

<template>
  <section id="interests" class="card">
    <h2>兴趣爱好</h2>
    <ul class="item-list">
      <li v-for="interest in interests" :key="interest">{{ interest }}</li>
    </ul>
  </section>
</template>
