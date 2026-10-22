<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import { useArticleStore } from '../stores/articles'

const route = useRoute()
const store = useArticleStore()
const { findById } = storeToRefs(store)
// 查询 getter 解构后是 ref；路由编号或 Store 数据变化时重新计算详情。
const article = computed(() => findById.value(route.params.id))
</script>

<template>
  <RouterLink :to="{ name: 'ArticleList' }">返回文章列表</RouterLink>
  <article v-if="article" class="article-detail">
    <header>
      <p class="article-meta">{{ article.category }} · {{ article.author }}</p>
      <h3>{{ article.title }}</h3>
      <p class="article-meta">更新于 <time :datetime="article.updatedAt">{{ new Date(article.updatedAt).toLocaleDateString('zh-CN') }}</time></p>
      <p class="article-summary">{{ article.summary }}</p>
    </header>
    <div class="article-body">{{ article.content }}</div>
  </article>
  <section v-else role="status" class="article-detail">
    <h3>文章不存在</h3>
    <p>该文章可能已被删除，请返回列表查看其他文章。</p>
  </section>
</template>

<style scoped>
.article-detail { max-width: 760px; margin: 24px auto 0; }
.article-detail h3 { margin: 12px 0; font-size: 26px; }
.article-meta { color: #63716a; font-size: 14px; }
.article-summary { padding: 16px 0; border-top: 1px solid #c9d8d2; border-bottom: 1px solid #c9d8d2; }
.article-body { padding: 16px 0; white-space: pre-wrap; line-height: 2; }
</style>
