<script setup>
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'

const { profile } = storeToRefs(useProfileStore())
</script>

<template>
  <section id="contact" class="card contact-card">
    <h2>联系信息</h2>
    <p><a :href="'mailto:' + profile.email">{{ profile.email }}</a></p>
  </section>
</template>

<style scoped>
.contact-card a {
  color: #35745b;
  overflow-wrap: anywhere;
  text-decoration: none;
}
.contact-card a:hover {
  text-decoration: underline;
}
</style>
