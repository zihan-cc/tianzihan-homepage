import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia } from 'pinia'
import { createMemoryHistory } from 'vue-router'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'

test('application routes enforce user Store authentication', async t => {
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
    // 载入应用的真实路由配置和守卫，避免测试中另写一套拦截逻辑。
    const { default: createAppRouter } = await server.ssrLoadModule('/src/router/index.js')
    const { useUserStore } = await server.ssrLoadModule('/src/stores/user.js')
    const { getLoginDestination } = await server.ssrLoadModule('/src/router/auth.js')
    const createContext = () => {
      const pinia = createPinia()
      return { router: createAppRouter(pinia, createMemoryHistory()), user: useUserStore(pinia) }
    }

    await t.test('anonymous visits to every admin page redirect before entering', async () => {
      storage.clear()
      for (const path of ['/admin', '/admin/profile', '/admin/projects', '/admin/articles?mode=edit#editor']) {
        const { router } = createContext()
        await router.push(path)
        assert.equal(router.currentRoute.value.name, 'Login')
        const expected = path === '/admin' ? '/admin/profile' : path
        assert.equal(router.currentRoute.value.query.redirect, expected)
        assert.ok(!router.currentRoute.value.matched.some(record => record.meta.requiresAuth))
      }
    })

    await t.test('public routes remain available without login', async () => {
      storage.clear()
      const { router } = createContext()
      for (const path of ['/home', '/profile', '/skills', '/projects', '/projects/1', '/articles', '/articles/1', '/missing']) {
        await router.push(path)
        assert.notEqual(router.currentRoute.value.name, 'Login')
      }
    })

    await t.test('invalid credentials stay blocked; valid login returns to the complete target', async () => {
      storage.clear()
      const { router, user } = createContext()
      const target = '/admin/articles?mode=edit#editor'
      await router.push(target)
      assert.equal(user.login('admin', 'wrong'), false)
      await router.push('/admin/projects')
      assert.equal(router.currentRoute.value.name, 'Login')
      await router.push(target)
      const destination = getLoginDestination(router, router.currentRoute.value.query.redirect)
      assert.equal(user.login('admin', '123456'), true)
      await router.replace(destination)
      assert.equal(router.currentRoute.value.fullPath, target)
      for (const path of ['/admin/profile', '/admin/projects', '/admin/articles']) {
        await router.push(path)
        assert.equal(router.currentRoute.value.path, path)
      }
    })

    await t.test('authenticated login visits share the same validated return rule', async () => {
      storage.clear()
      const { router, user } = createContext()
      user.login('admin', '123456')
      await router.push({ name: 'Login', query: { redirect: '/admin/projects?from=login' } })
      assert.equal(router.currentRoute.value.fullPath, '/admin/projects?from=login')
      for (const target of [undefined, '/home', '/unknown', '/login', '//example.com', 'https://example.com', ['/admin/articles']]) {
        assert.deepEqual(getLoginDestination(router, target), { name: 'AdminProfile' })
        await router.push({ name: 'Login', query: target === undefined ? {} : { redirect: target } })
        assert.equal(router.currentRoute.value.name, 'AdminProfile')
      }
    })

    await t.test('a fresh application restores login before its first protected navigation', async () => {
      storage.clear()
      createContext().user.login('admin', '123456')
      const { router, user } = createContext()
      await router.push('/admin/articles')
      assert.equal(user.isAuthenticated, true)
      assert.equal(router.currentRoute.value.name, 'AdminArticles')
    })

    await t.test('logout blocks browser history, direct navigation and a fresh application', async () => {
      storage.clear()
      const { router, user } = createContext()
      user.login('admin', '123456')
      await router.push('/home')
      await router.push('/admin/profile')
      await router.push('/admin/projects')
      user.logout()
      await router.replace({ name: 'Login' })
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { remove(); reject(new Error('Back navigation timed out')) }, 2000)
        const remove = router.afterEach(() => { clearTimeout(timeout); remove(); resolve() })
        router.back()
      })
      assert.equal(router.currentRoute.value.name, 'Login')
      assert.equal(router.currentRoute.value.query.redirect, '/admin/profile')
      await router.push('/admin/articles')
      assert.equal(router.currentRoute.value.name, 'Login')
      const restored = createContext()
      await restored.router.push('/admin/projects')
      assert.equal(restored.router.currentRoute.value.name, 'Login')
      assert.equal(storage.has('homepage-user'), false)
    })

    await t.test('invalid stored identities cannot enter the admin area', async () => {
      for (const raw of ['{broken', 'null', '{"username":"visitor"}', '{"isAuthenticated":true}']) {
        storage.set('homepage-user', raw)
        const { router, user } = createContext()
        await router.push('/admin/profile')
        assert.equal(user.isAuthenticated, false)
        assert.equal(router.currentRoute.value.name, 'Login')
      }
    })

    await t.test('each router consults its own Pinia even if another app is active', async () => {
      storage.clear()
      const first = createContext()
      const second = createContext()
      first.user.login('admin', '123456')
      await first.router.push('/admin/articles')
      await second.router.push('/admin/articles')
      assert.equal(first.router.currentRoute.value.name, 'AdminArticles')
      assert.equal(second.router.currentRoute.value.name, 'Login')
    })
  } finally {
    await server.close()
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else delete globalThis.localStorage
  }
})
