import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'

test('article store CRUD, reactivity and persistence', async t => {
  const storage = new Map()
  let failWrites = false
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) throw new Error('Storage unavailable')
      storage.set(key, String(value))
    },
  } })
  const server = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  try {
    const { useArticleStore, validateArticle } = await server.ssrLoadModule('/src/stores/articles.js')
    const freshStore = () => {
      setActivePinia(createPinia())
      return useArticleStore()
    }
    let store = freshStore()
    const draft = { title: ' 新文章 ', category: '测试', author: '作者', summary: '摘要', content: '第一段\n\n<script>文本</script>' }
    let id

    await t.test('create updates refs and serializes normalized data', () => {
      const { articleCount, sortedArticles, categories } = storeToRefs(store)
      const before = articleCount.value
      const article = store.saveArticle(draft)
      id = article.id
      assert.equal(article.title, '新文章')
      assert.equal(articleCount.value, before + 1)
      assert.ok(sortedArticles.value.some(item => item.id === id))
      assert.ok(categories.value.includes('测试'))
      assert.equal(JSON.parse(storage.get('homepage-articles')).items.find(item => item.id === id).content, draft.content)
    })

    await t.test('reload, lookup and update preserve identity and creation date', () => {
      store = freshStore()
      const createdAt = store.findById(String(id)).createdAt
      const updated = store.saveArticle({ ...draft, title: '更新标题' }, id)
      assert.equal(updated.id, id)
      assert.equal(updated.createdAt, createdAt)
      assert.equal(freshStore().findById(id).title, '更新标题')
      for (const invalid of ['abc', '-1', '1.5', '0', '9007199254740992']) assert.equal(store.findById(invalid), undefined)
    })

    await t.test('invalid content and missing IDs cannot mutate saved data', () => {
      const saved = storage.get('homepage-articles')
      assert.ok(validateArticle({ ...draft, title: '   ' }).title)
      assert.ok(validateArticle({ ...draft, content: 'x'.repeat(20001) }).content)
      assert.throws(() => store.saveArticle({ ...draft, summary: '' }))
      assert.throws(() => store.saveArticle(draft, 999999))
      assert.throws(() => store.deleteArticle(999999))
      assert.equal(storage.get('homepage-articles'), saved)
    })

    await t.test('failed create, update and delete leave reactive state unchanged', () => {
      const before = JSON.stringify(store.$state)
      const saved = storage.get('homepage-articles')
      failWrites = true
      try {
        assert.throws(() => store.saveArticle(draft))
        assert.throws(() => store.saveArticle(draft, id))
        assert.throws(() => store.deleteArticle(id))
        assert.equal(JSON.stringify(store.$state), before)
        assert.equal(storage.get('homepage-articles'), saved)
      } finally { failWrites = false }
    })

    await t.test('delete all, reload empty list and create without recycling IDs', () => {
      const lastId = store.lastId
      for (const item of [...store.articles]) store.deleteArticle(item.id)
      store = freshStore()
      assert.equal(store.articleCount, 0)
      assert.equal(store.findById(id), undefined)
      assert.ok(store.saveArticle(draft).id > lastId)
    })

    await t.test('malformed storage falls back to usable initial articles', () => {
      for (const raw of ['{broken', 'null', '{"lastId":0,"items":[null]}']) {
        storage.set('homepage-articles', raw)
        assert.equal(freshStore().articleCount, 2)
      }
      storage.clear()
      assert.equal(freshStore().findById(1).title, '从个人主页开始理解 Vue 组件')
    })
  } finally {
    await server.close()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  }
})
