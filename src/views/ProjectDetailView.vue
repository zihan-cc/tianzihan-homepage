<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '../stores/projects'

const store = useProjectStore()
const { projects, findProjectById } = storeToRefs(store)

const route = useRoute()
const router = useRouter()
const baseUrl = import.meta.env.BASE_URL

// Recompute when only the route parameter changes and Vue reuses this component.
const project = computed(() => findProjectById.value(route.params.id))
const otherProjects = computed(() => projects.value.filter((item) => item.id !== project.value?.id))

function backToPreviousPage() {
  // Vue Router tracks the previous in-app address separately from external browser history.
  if (typeof router.options.history.state.back === 'string') {
    router.go(-1)
  } else {
    router.replace({ name: 'ProjectList' })
  }
}

function leaveMissingProject() {
  router.replace({ name: 'ProjectList' })
}
</script>

<template>
  <article v-if="project" class="project-detail">
    <nav class="detail-actions" aria-label="项目详情导航">
      <button type="button" class="secondary-action" @click="backToPreviousPage">返回上一页</button>
      <RouterLink :to="{ name: 'ProjectList' }">返回项目列表</RouterLink>
    </nav>
    <header class="detail-header">
      <p class="category">{{ project.category }}</p>
      <h3>{{ project.name }}</h3>
      <p>{{ project.summary }}</p>
      <dl class="project-meta">
        <div><dt>项目编号</dt><dd>{{ project.id }}</dd></div>
        <div><dt>技术栈</dt><dd>{{ project.technologies.join(' · ') }}</dd></div>
      </dl>
    </header>
    <img v-if="project.cover" class="detail-cover" :src="baseUrl + project.cover" :alt="project.name + '页面截图'" width="960" height="540" />
    <section class="detail-section">
      <h4>项目介绍</h4>
      <p>{{ project.description }}</p>
    </section>
    <section class="detail-section">
      <h4>主要功能</h4>
      <ul><li v-for="feature in project.features" :key="feature">{{ feature }}</li></ul>
    </section>
    <nav v-if="otherProjects.length" class="related-projects" aria-label="其他项目">
      <h4>其他项目</h4>
      <RouterLink v-for="item in otherProjects" :key="item.id"
        :to="{ name: 'ProjectDetail', params: { id: item.id } }">{{ item.name }}</RouterLink>
    </nav>
  </article>
  <section v-else class="missing-project" role="status">
    <h3>项目不存在</h3>
    <p>没有找到该编号对应的项目，请返回列表查看其他作品。</p>
    <button type="button" @click="leaveMissingProject">返回项目列表</button>
  </section>
</template>

<style scoped>
.project-detail {
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.detail-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 20px;
}

.detail-header {
  padding: 20px 0;
}

.category {
  margin: 0 0 6px;
  color: #63716a;
  font-size: 14px;
}

.detail-header h3 {
  margin: 0 0 12px;
  font-size: 24px;
}

.project-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 40px;
  margin-bottom: 0;
}

.project-meta div {
  min-width: 0;
}

.project-meta dt {
  color: #63716a;
  font-size: 14px;
}

.project-meta dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.detail-cover {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: #fff;
  border: 1px solid #dfe9e5;
}

.detail-section,
.related-projects {
  padding: 20px 0;
  border-bottom: 1px solid #dfe9e5;
}

h4 {
  margin: 0 0 12px;
  font-size: 18px;
}

.detail-section p {
  margin: 0;
}

.detail-section ul {
  margin: 0;
  padding-left: 22px;
}

.related-projects a {
  display: inline-block;
  margin: 0 20px 8px 0;
}

.missing-project {
  padding: 24px 0;
}
</style>
