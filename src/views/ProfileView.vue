<script setup>
import { onMounted } from 'vue'
import { ElCard, ElTimeline, ElTimelineItem } from 'element-plus'
import ProfileCard from '../components/ProfileCard.vue'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'

const { profile } = storeToRefs(useProfileStore())

const timeline = [
  {
    timestamp: '2024-09',
    title: '进入计算机科学与技术专业',
    description: '开始系统学习程序设计基础，建立前端开发的学习目标。',
    type: 'primary',
  },
  {
    timestamp: '2025-03',
    title: '完成 HTML 与 CSS 页面练习',
    description: '掌握语义化结构、盒模型、Flex 布局和响应式页面基础。',
    type: 'success',
  },
  {
    timestamp: '2025-10',
    title: '开始学习 Vue 3 组件化开发',
    description: '使用组件、props、事件和 v-model 拆分个人主页功能。',
    type: 'warning',
  },
  {
    timestamp: '2026-10',
    title: '完成 Router、Pinia 与 Element Plus 实验',
    description: '实现路由访问控制、共享状态持久化和组件库接入。',
    type: 'danger',
  },
]

onMounted(() => console.log('个人信息页面加载完成'))
</script>

<template>
  <div class="profile-page">
    <ProfileCard :profile="profile" />
    <el-card class="timeline-card" shadow="never">
      <template #header>
        <div class="timeline-heading">
          <div>
            <h2>学习经历</h2>
            <p>记录从基础页面到 Vue 生态实践的学习节点</p>
          </div>
          <span class="timeline-count">{{ timeline.length }} 个节点</span>
        </div>
      </template>
      <el-timeline aria-label="学习经历时间线">
        <el-timeline-item v-for="item in timeline" :key="item.timestamp" :timestamp="item.timestamp"
          :type="item.type" placement="top">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<style scoped>
.profile-page {
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.15fr);
  gap: 20px;
  align-items: start;
}

.profile-page :deep(.profile-card) {
  min-width: 0;
}

.timeline-card {
  min-width: 0;
  border-color: #dfe9e5;
}

.timeline-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.timeline-heading h2 {
  margin: 0;
  color: #35495e;
  font-size: 20px;
}

.timeline-heading p {
  margin: 8px 0 0;
  color: #63716a;
  font-size: 14px;
  line-height: 1.6;
}

.timeline-count {
  flex: 0 0 auto;
  color: #28734f;
  font-size: 14px;
  white-space: nowrap;
}

.timeline-card :deep(.el-timeline) {
  margin: 0;
  padding-left: 8px;
}

.timeline-card h3 {
  margin: 0 0 6px;
  color: #35495e;
  font-size: 16px;
}

.timeline-card p {
  margin: 0;
  color: #63716a;
  line-height: 1.7;
}

@media (max-width: 760px) {
  .profile-page {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 480px) {
  .timeline-heading {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
