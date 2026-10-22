<script setup>
import { computed, ref } from 'vue'
import { ElButton, ElCard, ElEmpty, ElForm, ElFormItem, ElInput, ElOption, ElSelect, ElTag } from 'element-plus'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '../stores/projects'

const { projects, categories, projectCount } = storeToRefs(useProjectStore())
const keyword = ref('')
const category = ref('')
const filteredProjects = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return projects.value.filter(item => (!category.value || item.category === category.value) &&
    [item.name, item.summary, item.description, ...item.technologies, ...item.features]
      .some(value => value.toLowerCase().includes(text)))
})

const baseUrl = import.meta.env.BASE_URL
</script>

<template>
  <el-form class="project-filters" inline aria-label="项目筛选">
    <el-form-item label="搜索项目" prop="keyword">
      <el-input id="project-search" v-model="keyword" type="search" clearable
        placeholder="项目名称、介绍或技术栈" />
    </el-form-item>
    <el-form-item label="项目分类" prop="category">
      <el-select id="project-category-filter" v-model="category" clearable placeholder="全部分类">
        <el-option label="全部分类" value="" />
        <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
      </el-select>
    </el-form-item>
  </el-form>
  <p class="result-count" role="status">共 {{ projectCount }} 个项目，当前显示 {{ filteredProjects.length }} 个</p>
  <div v-if="filteredProjects.length" class="project-grid">
    <el-card v-for="project in filteredProjects" :key="project.id" class="project-card" shadow="never">
      <img v-if="project.cover" class="project-cover" :src="baseUrl + project.cover" :alt="project.name + '页面截图'" width="960" height="540" />
      <div class="project-content">
        <el-tag size="small" effect="plain">{{ project.category }}</el-tag>
        <h3>{{ project.name }}</h3>
        <p>{{ project.summary }}</p>
        <div class="technology-tags" aria-label="项目技术栈">
          <el-tag v-for="technology in project.technologies" :key="technology" type="success" size="small">
            {{ technology }}
          </el-tag>
        </div>
        <RouterLink :to="{ name: 'ProjectDetail', params: { id: project.id } }"
          :aria-label="'查看' + project.name + '详情'">查看详情</RouterLink>
      </div>
    </el-card>
  </div>
  <div v-else class="empty-projects">
    <el-empty :description="projectCount ? '没有找到匹配的项目。' : '暂无项目。'">
      <el-button v-if="keyword || category" type="primary" plain @click="keyword = ''; category = ''">清除筛选</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.project-filters { display: flex; max-width: none; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 18px; }
.project-filters :deep(.el-form-item) { margin-bottom: 0; }
.project-filters :deep(.el-input) { width: min(360px, 52vw); }
.project-filters :deep(.el-select) { width: 180px; }
.result-count { color: #63716a; font-size: 14px; }
.project-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.project-card {
  min-width: 0;
  overflow: hidden;
}

.project-card :deep(.el-card__body) {
  padding: 0;
}

.project-cover {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: #f3f7f6;
  border-bottom: 1px solid #dfe9e5;
}

.project-content {
  padding: 20px;
  overflow-wrap: anywhere;
}

.project-content h3 {
  margin: 8px 0 12px;
  font-size: 20px;
}

.project-content p {
  line-height: 1.7;
}

.project-content .category {
  margin: 0;
  color: #63716a;
  font-size: 14px;
}

.technology-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 12px 0 16px;
}

.technologies {
  color: #35745b;
  font-size: 14px;
}

@media (max-width: 720px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .project-filters :deep(.el-input),
  .project-filters :deep(.el-select) { width: 100%; }
}
</style>
