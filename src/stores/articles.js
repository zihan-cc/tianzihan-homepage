import { defineStore } from 'pinia'
import { loadStoredData, storeData } from '../data/storage'

const storageKey = 'homepage-articles'
const initialData = {
  lastId: 2,
  items: [
    {
      id: 1, title: '从个人主页开始理解 Vue 组件', category: 'Vue 学习', author: '田紫涵',
      summary: '把个人资料、技能搜索和公共导航拆成组件，让页面结构更清楚，也让功能更容易复用。',
      content: '制作个人主页时，我把页头、个人资料、技能搜索和页脚拆成独立组件。每个组件负责一项相对完整的功能，页面只需要负责组合它们。\n\n个人资料通过 props 传入展示组件，技能搜索使用 v-model 绑定关键词，并通过 computed 得到筛选结果。这样既能减少重复代码，也能让数据流向更清楚。\n\n增加首页后，可以复用已有的展示组件，而不必重新实现搜索和资料展示逻辑。组件划分应围绕具体职责展开。',
      createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z',
    },
    {
      id: 2, title: '用动态路由展示不同项目', category: '路由实践', author: '田紫涵',
      summary: '通过项目编号复用详情页，并为找不到的数据提供明确的返回入口。',
      content: '个人主页中的每个项目都拥有独立编号。使用 /projects/:id 动态路由后，不同项目可以共用一个详情组件。\n\n详情组件读取 route.params.id，再从共享数据中查找项目。把查询写在 computed 中，切换编号时即使组件被复用，页面也会更新。\n\n处理详情页还需要考虑不存在的编号、浏览器刷新和返回操作。显示明确的空状态，并提供返回列表的入口，可以避免用户停留在没有内容的页面。',
      createdAt: '2026-10-15T01:00:00.000Z', updatedAt: '2026-10-15T01:00:00.000Z',
    },
  ],
}

export const articleFields = [
  { key: 'title', label: '文章标题', limit: 100 },
  { key: 'category', label: '文章分类', limit: 40 },
  { key: 'author', label: '作者', limit: 40 },
  { key: 'summary', label: '文章摘要', limit: 300, rows: 3 },
  { key: 'content', label: '文章正文', limit: 20000, rows: 12 },
]

export function validateArticle(value) {
  const errors = {}
  for (const { key, label, limit } of articleFields) {
    if (typeof value[key] !== 'string' || !value[key].trim()) errors[key] = `请填写${label}，不能只输入空格。`
    else if (value[key].length > limit) errors[key] = `${label}不能超过 ${limit} 字。`
  }
  return errors
}

function validData(value) {
  return value && Number.isSafeInteger(value.lastId) && value.lastId >= 0 && Array.isArray(value.items) &&
    new Set(value.items.map(item => item?.id)).size === value.items.length &&
    value.items.every(item => item && Number.isSafeInteger(item.id) && item.id > 0 && item.id <= value.lastId &&
      !Object.keys(validateArticle(item)).length &&
      ['createdAt', 'updatedAt'].every(key => typeof item[key] === 'string' && Number.isFinite(Date.parse(item[key]))))
}

export const useArticleStore = defineStore('articles', {
  state: () => {
    const saved = loadStoredData(storageKey, initialData, validData)
    return { articles: saved.items.map(item => ({ ...item })), lastId: saved.lastId }
  },
  getters: {
    sortedArticles: state => [...state.articles].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || b.id - a.id),
    articleCount: state => state.articles.length,
    categories: state => [...new Set(state.articles.map(item => item.category))],
    findById: state => value => {
      const id = Number(value)
      return Number.isSafeInteger(id) && id > 0 ? state.articles.find(item => item.id === id) : undefined
    },
  },
  actions: {
    saveArticle(draft, id = null) {
      const value = Object.fromEntries(articleFields.map(({ key }) => [key, typeof draft[key] === 'string' ? draft[key].trim() : '']))
      if (Object.keys(validateArticle(value)).length) throw new Error('Invalid article')
      const existing = id === null ? null : this.findById(id)
      if (id !== null && !existing) throw new Error('Article not found')
      const nextId = existing ? existing.id : this.lastId + 1
      if (!Number.isSafeInteger(nextId)) throw new Error('Article ID limit reached')
      const now = new Date().toISOString()
      const article = { ...value, id: nextId, createdAt: existing?.createdAt || now, updatedAt: now }
      const items = existing ? this.articles.map(item => item.id === nextId ? article : item) : [...this.articles, article]
      const lastId = Math.max(this.lastId, nextId)
      // Persist the list and ID counter together before publishing reactive changes.
      storeData(storageKey, { items, lastId })
      this.articles = items
      this.lastId = lastId
      return article
    },
    deleteArticle(id) {
      const article = this.findById(id)
      if (!article) throw new Error('Article not found')
      const items = this.articles.filter(item => item.id !== article.id)
      storeData(storageKey, { items, lastId: this.lastId })
      this.articles = items
    },
  },
})
