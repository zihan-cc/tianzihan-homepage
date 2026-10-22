<script setup>
import { RouterLink } from 'vue-router'
import ProfileCard from '../components/ProfileCard.vue'
import SkillsView from './SkillsView.vue'
import InterestsView from './InterestsView.vue'
import ContactView from './ContactView.vue'
import ProjectListView from './ProjectListView.vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'

const { profile } = storeToRefs(useProfileStore())
</script>

<template>
  <div class="homepage-grid">
    <ProfileCard :profile="profile" />
    <SkillsView />
    <InterestsView />
    <ContactView />
  </div>
  <section class="home-projects" aria-labelledby="home-projects-heading">
    <header class="projects-heading">
      <h2 id="home-projects-heading">项目中心</h2>
      <RouterLink :to="{ name: 'ProjectList' }">全部项目</RouterLink>
    </header>
    <ProjectListView />
  </section>
</template>

<style scoped>
.homepage-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  align-items: stretch;
}

.homepage-grid > :deep(.card) {
  min-width: 0;
  overflow-wrap: anywhere;
}

.homepage-grid > :deep(.profile-card) {
  grid-row: auto;
}

.home-projects {
  margin-top: 32px;
}

.projects-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.projects-heading h2 {
  margin: 0;
  color: #35495e;
  font-size: 24px;
}

.home-projects :deep(a) {
  color: #35745b;
  text-underline-offset: 4px;
}

@media (max-width: 720px) {
  .homepage-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
