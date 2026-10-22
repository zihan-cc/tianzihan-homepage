import test from 'node:test'
import assert from 'node:assert/strict'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, storeToRefs } from 'pinia'
import { createMemoryHistory, RouterView } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

test('project and article CRUD stays consistent across pages and reloads', async t => {
  const storage = new Map()
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  } })
  const server = await createServer({
    configFile: false, plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  try {
    const { default: createAppRouter } = await server.ssrLoadModule('/src/router/index.js')
    const { useProjectStore } = await server.ssrLoadModule('/src/stores/projects.js')
    const { useArticleStore } = await server.ssrLoadModule('/src/stores/articles.js')
    const { useUserStore } = await server.ssrLoadModule('/src/stores/user.js')
    const projectDraft = {
      name: ' CRUD 项目 ', category: ' 实验四 ', summary: ' 项目摘要 ', description: ' 项目详细介绍 ',
      technologies: [' Vue 3 '], features: [' 增删改查 '], cover: '',
    }
    const articleDraft = {
      title: ' CRUD 文章 ', category: ' 实验四 ', author: ' 作者 ', summary: ' 文章摘要 ', content: ' 第一段\n第二段 ',
    }
    const pinia = createPinia()
    const router = createAppRouter(pinia, createMemoryHistory())
    useUserStore(pinia).login('admin', '123456')
    const render = async (path, appPinia = pinia, appRouter = router) => {
      const app = createSSRApp(RouterView).use(appPinia).use(appRouter)
      await appRouter.push(path)
      return renderToString(app)
    }

    for (const entry of [
      { label: 'projects', useStore: useProjectStore, draft: projectDraft, field: 'name', list: 'projects', count: 'projectCount', find: 'findProjectById',
        create: (store, draft) => store.addProject(draft), update: (store, draft, id) => store.saveProject({ ...draft, id }), remove: (store, id) => store.deleteProject(id),
        empty: '暂无项目。', missing: '项目不存在', add: '新增项目' },
      { label: 'articles', useStore: useArticleStore, draft: articleDraft, field: 'title', list: 'articles', count: 'articleCount', find: 'findById',
        create: (store, draft) => store.saveArticle(draft), update: (store, draft, id) => store.saveArticle(draft, id), remove: (store, id) => store.deleteArticle(id),
        empty: '暂无文章。', missing: '文章不存在', add: '新增文章' },
    ]) {
      await t.test(`${entry.label}: create, edit using a string ID, delete and reload actual pages`, async () => {
        const store = entry.useStore(pinia)
        const refs = storeToRefs(store)
        const before = refs[entry.count].value
        const created = entry.create(store, entry.draft)
        const id = created.id
        assert.equal(refs[entry.count].value, before + 1)
        assert.equal(created[entry.field], entry.draft[entry.field].trim())
        assert.equal(store[entry.find](String(id)).id, id)
        for (const path of [`/${entry.label}`, `/${entry.label}/${id}`, `/admin/${entry.label}`]) {
          assert.ok((await render(path)).includes(created[entry.field]))
        }

        const changedTitle = `修改后的${entry.label}`
        entry.update(store, { ...entry.draft, [entry.field]: ` ${changedTitle} ` }, String(id))
        assert.equal(store[entry.find](id)[entry.field], changedTitle)
        assert.equal(store[entry.find](id).id, id)
        assert.equal(refs[entry.count].value, before + 1)
        for (const path of [`/${entry.label}`, `/${entry.label}/${id}`, `/admin/${entry.label}`]) {
          assert.ok((await render(path)).includes(changedTitle))
        }
        const reloadedPinia = createPinia()
        const reloadedRouter = createAppRouter(reloadedPinia, createMemoryHistory())
        assert.ok((await render(`/${entry.label}/${id}`, reloadedPinia, reloadedRouter)).includes(changedTitle))

        entry.remove(store, String(id))
        assert.equal(refs[entry.count].value, before)
        assert.equal(store[entry.find](id), undefined)
        assert.ok(!(await render(`/${entry.label}`)).includes(changedTitle))
        assert.ok((await render(`/${entry.label}/${id}`)).includes(entry.missing))
        assert.equal(entry.useStore(createPinia())[entry.find](id), undefined)

        // 删除到空列表后，管理页仍可新增，刷新不能重新出现默认内容。
        for (const item of [...store[entry.list]]) entry.remove(store, item.id)
        assert.ok((await render(`/${entry.label}`)).includes(entry.empty))
        const emptyAdmin = await render(`/admin/${entry.label}`)
        assert.ok(emptyAdmin.includes(entry.empty))
        assert.ok(emptyAdmin.includes(entry.add))
        const emptyStore = entry.useStore(createPinia())
        assert.equal(emptyStore[entry.count], 0)
        assert.ok(entry.create(emptyStore, entry.draft).id > id)
      })
    }

    await t.test('project validation rejects empty normalized fields and invalid IDs without changing stored content', () => {
      const store = useProjectStore(createPinia())
      const before = storage.get('homepage-projects')
      assert.throws(() => store.addProject({ ...projectDraft, technologies: ['   '] }))
      assert.throws(() => store.addProject({ ...projectDraft, name: '   ' }))
      for (const id of ['abc', '-1', '0', '1.5', '999999']) {
        assert.equal(store.findProjectById(id), undefined)
        assert.throws(() => store.saveProject({ ...projectDraft, id }))
        assert.throws(() => store.deleteProject(id))
      }
      assert.equal(storage.get('homepage-projects'), before)
    })
  } finally {
    await server.close()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  }
})
