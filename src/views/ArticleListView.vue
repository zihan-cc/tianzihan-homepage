<script setup>
import { computed, ref } from 'vue'
import { ElButton, ElCard, ElEmpty, ElForm, ElFormItem, ElInput, ElOption, ElSelect, ElTag } from 'element-plus'
import { storeToRefs } from 'pinia'
import { RouterLink } from 'vue-router'
import { useArticleStore } from '../stores/articles'

const { sortedArticles, categories, articleCount } = storeToRefs(useArticleStore())
const keyword = ref('')
const category = ref('')
const filteredArticles = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return sortedArticles.value.filter(item => (!category.value || item.category === category.value) &&
    [item.title, item.summary, item.author, item.content].some(value => value.toLowerCase().includes(text)))
})
</script>

<template>
  <el-form class="article-filters" inline aria-label="文章筛选">
    <el-form-item label="搜索文章" prop="keyword">
      <el-input id="article-search" v-model="keyword" type="search" clearable placeholder="标题、内容或作者" />
    </el-form-item>
    <el-form-item label="文章分类" prop="category">
      <el-select id="article-category-filter" v-model="category" clearable placeholder="全部分类">
        <el-option label="全部分类" value="" />
        <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
      </el-select>
    </el-form-item>
  </el-form>
  <p class="result-count" role="status">共 {{ articleCount }} 篇文章，当前显示 {{ filteredArticles.length }} 篇</p>
  <div v-if="filteredArticles.length">
    <el-card v-for="article in filteredArticles" :key="article.id" class="article-row" shadow="never">
      <div class="article-meta">
        <el-tag size="small" effect="plain">{{ article.category }}</el-tag>
        <span>{{ article.author }} · 更新于 <time :datetime="article.updatedAt">{{ new Date(article.updatedAt).toLocaleDateString('zh-CN') }}</time></span>
      </div>
      <h3><RouterLink :to="{ name: 'ArticleDetail', params: { id: article.id } }">{{ article.title }}</RouterLink></h3>
      <p>{{ article.summary }}</p>
      <RouterLink :to="{ name: 'ArticleDetail', params: { id: article.id } }" :aria-label="'阅读' + article.title">阅读全文</RouterLink>
    </el-card>
  </div>
  <div v-else class="empty-articles">
    <el-empty :description="articleCount ? '没有找到匹配的文章。' : '暂无文章。'">
      <el-button v-if="keyword || category" type="primary" plain @click="keyword = ''; category = ''">清除筛选</el-button>
    </el-empty>
  </div>
</template>

<style scoped>
.article-filters { display: flex; max-width: none; flex-wrap: wrap; gap: 8px 20px; margin-bottom: 18px; }
.article-filters :deep(.el-form-item) { margin-bottom: 0; }
.article-filters :deep(.el-input) { width: min(360px, 52vw); }
.article-filters :deep(.el-select) { width: 180px; }
.result-count, .article-meta { color: #63716a; font-size: 14px; }
.article-row { margin-bottom: 16px; border-color: #dfe9e5; }
.article-row :deep(.el-card__body) { padding: 20px; }
.article-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.article-row h3 { margin: 8px 0 12px; font-size: 21px; }
.article-row p { margin: 0 0 12px; }
.article-row h3 a { text-decoration: none; }
.article-row h3 a:hover { text-decoration: underline; }
.empty-articles { padding: 24px 0; }
@media (max-width: 600px) {
  .article-filters :deep(.el-input),
  .article-filters :deep(.el-select) { width: 100%; }
}
</style>
