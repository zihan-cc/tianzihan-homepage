import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

test('article page rendering with shared Pinia data', async t => {
  const storage = new Map()
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  } })
  const server = await createServer({
    configFile: false, plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  try {
    const load = async name => (await server.ssrLoadModule(`/src/views/${name}.vue`)).default
    const list = await load('ArticleListView')
    const detail = await load('ArticleDetailView')
    const layout = await load('ArticlesView')
    const admin = await load('AdminArticlesView')
    const { useArticleStore } = await server.ssrLoadModule('/src/stores/articles.js')
    const pinia = createPinia()
    const store = useArticleStore(pinia)
    const router = createRouter({ history: createMemoryHistory(), routes: [
      { path: '/articles', component: layout, children: [
        { path: '', name: 'ArticleList', component: list },
        { path: ':id', name: 'ArticleDetail', component: detail },
      ] },
      { path: '/admin/articles', component: admin },
    ] })
    const render = async path => {
      const app = createSSRApp(RouterView).use(pinia).use(router)
      await router.push(path)
      return renderToString(app)
    }

    await t.test('public list includes filters and dynamic detail links', async () => {
      const html = await render('/articles')
      assert.ok(html.includes('搜索文章'))
      assert.ok(html.includes('全部分类'))
      assert.ok(html.includes('href="/articles/1"'))
      assert.ok(html.includes('从个人主页开始理解 Vue 组件'))
    })
    await t.test('detail reflects saved data and escapes HTML in article content', async () => {
      store.saveArticle({ ...store.findById(1), title: '修改后的文章', content: '<script>alert(1)</script>\n第二段' }, 1)
      const html = await render('/articles/1')
      assert.ok(html.includes('修改后的文章'))
      assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'))
      assert.ok(!html.includes('<script>alert(1)</script>'))
      assert.ok((await render('/articles')).includes('修改后的文章'))
    })
    await t.test('missing detail and admin editor render correctly', async () => {
      assert.ok((await render('/articles/999')).includes('文章不存在'))
      const html = await render('/admin/articles')
      for (const label of ['选择文章', '文章标题', '文章正文', '保存文章', '取消修改', '删除文章']) assert.ok(html.includes(label))
    })
    await t.test('empty list and empty admin retain an add entry', async () => {
      for (const item of [...store.articles]) store.deleteArticle(item.id)
      assert.ok((await render('/articles')).includes('暂无文章。'))
      const html = await render('/admin/articles')
      assert.ok(html.includes('暂无文章。'))
      assert.ok(html.includes('新增文章'))
    })
  } finally {
    await server.close()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  }
})
