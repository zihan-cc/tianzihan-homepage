import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createPinia, storeToRefs } from 'pinia'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'

test('shared stores preserve existing data and update their consuming pages', async t => {
  const storage = new Map()
  const session = new Map()
  let failWrites = false
  const descriptors = new Map(['localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  for (const [key, values] of [['localStorage', storage], ['sessionStorage', session]]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: {
      getItem: name => values.get(name) ?? null,
      setItem: (name, value) => {
        if (failWrites) throw new Error('Storage unavailable')
        values.set(name, String(value))
      },
      removeItem: name => {
        if (failWrites) throw new Error('Storage unavailable')
        values.delete(name)
      },
    } })
  }
  const server = await createServer({
    configFile: false, plugins: [vue()],
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  })
  try {
    const { useProjectStore } = await server.ssrLoadModule('/src/stores/projects.js')
    const { useProfileStore } = await server.ssrLoadModule('/src/stores/profile.js')
    const { useUserStore } = await server.ssrLoadModule('/src/stores/user.js')
    const { defaultProjects } = await server.ssrLoadModule('/src/data/projects.js')
    const { defaultProfile } = await server.ssrLoadModule('/src/data/homepage.js')
    // 使用迁移前的键和数据格式，验证已有内容不会在接入 Pinia 后丢失。
    storage.set('homepage-projects', JSON.stringify([{ ...defaultProjects[0], id: 7, name: '原有项目' }]))
    storage.set('homepage-project-last-id', '12')
    storage.set('homepage-profile', JSON.stringify({ ...defaultProfile, name: '原有姓名' }))
    const pinia = createPinia()
    const projects = useProjectStore(pinia)
    const profile = useProfileStore(pinia)
    const user = useUserStore(pinia)

    await t.test('project CRUD preserves IDs, persistence and ref reactivity', () => {
      const { projectCount } = storeToRefs(projects)
      assert.equal(projects.findProjectById('7').name, '原有项目')
      const draft = { ...defaultProjects[0], technologies: ['Vue 3'] }
      const created = projects.addProject(draft)
      assert.equal(created.id, 13)
      assert.equal(projectCount.value, 2)
      draft.technologies.push('unsaved edit')
      assert.deepEqual([...created.technologies], ['Vue 3'])
      projects.saveProject({ ...created, name: '修改后的项目' })
      assert.equal(useProjectStore(createPinia()).findProjectById(13).name, '修改后的项目')
      projects.deleteProject('13')
      assert.equal(projectCount.value, 1)
      assert.equal(projects.findProjectById(13), undefined)
      assert.equal(useProjectStore(createPinia()).addProject(defaultProjects[0]).id, 14)
      assert.throws(() => projects.saveProject({ ...defaultProjects[0], id: 999 }))
      assert.throws(() => projects.addProject({ ...defaultProjects[0], name: ' ' }))
    })

    await t.test('profile getters and keyword are shared within a Pinia instance', () => {
      const { siteTitle, filteredSkills } = storeToRefs(profile)
      assert.equal(profile.profile.name, '原有姓名')
      profile.saveProfile({ ...profile.profile, name: '新的姓名', email: 'shared@example.com' })
      assert.equal(siteTitle.value, '新的姓名的个人主页')
      assert.equal(useProfileStore(createPinia()).profile.name, '新的姓名')
      profile.setKeyword(' VUE ')
      assert.equal(useProfileStore(pinia).keyword, 'VUE')
      assert.deepEqual(filteredSkills.value.map(item => item.name), ['Vue 3'])
      // 新的应用实例模拟页面刷新，从 localStorage 恢复搜索状态。
      assert.equal(useProfileStore(createPinia()).keyword, 'VUE')
      assert.equal(JSON.parse(storage.get('homepage-skill-keyword')), 'VUE')
    })

    await t.test('user actions handle invalid credentials, restore and logout', () => {
      const { isAuthenticated } = storeToRefs(user)
      assert.equal(user.login('admin', 'wrong'), false)
      assert.equal(isAuthenticated.value, false)
      assert.equal(user.login('admin', '123456'), true)
      assert.equal(isAuthenticated.value, true)
      assert.equal(user.username, 'admin')
      assert.deepEqual(JSON.parse(storage.get('homepage-user')), { username: 'admin' })
      session.clear()
      assert.equal(useUserStore(createPinia()).isAuthenticated, true)
      assert.ok(!JSON.stringify(user.$state).includes('123456'))
      assert.ok(!storage.get('homepage-user').includes('123456'))
      user.logout()
      assert.equal(isAuthenticated.value, false)
      assert.equal(useUserStore(createPinia()).isAuthenticated, false)
      assert.equal(storage.has('homepage-user'), false)
    })

    await t.test('failed storage writes cannot publish unsaved edits', () => {
      const beforeProjects = JSON.stringify(projects.$state)
      const beforeProfile = JSON.stringify(profile.$state)
      failWrites = true
      try {
        assert.throws(() => projects.addProject(defaultProjects[0]))
        assert.throws(() => projects.saveProject({ ...projects.projects[0], name: '不应保存' }))
        assert.throws(() => projects.deleteProject(7))
        assert.throws(() => profile.saveProfile({ ...profile.profile, name: '不应保存' }))
        assert.throws(() => profile.setKeyword('不应保存'))
        assert.throws(() => user.login('admin', '123456'))
        assert.equal(JSON.stringify(projects.$state), beforeProjects)
        assert.equal(JSON.stringify(profile.$state), beforeProfile)
        assert.equal(user.isAuthenticated, false)
      } finally { failWrites = false }
    })

    await t.test('failed logout retains the visible login state until storage is cleared', () => {
      user.login('admin', '123456')
      failWrites = true
      try {
        assert.throws(() => user.logout())
        assert.equal(user.isAuthenticated, true)
        assert.equal(useUserStore(createPinia()).isAuthenticated, true)
      } finally {
        failWrites = false
        user.logout()
      }
    })

    await t.test('existing pages read updated stores and render editor drafts', async () => {
      const pages = ['HomeView', 'ProfileView', 'ContactView', 'AdminProfileView', 'ProjectListView', 'ProjectDetailView', 'AdminProjectsView', 'SkillsView']
      const components = new Map()
      for (const name of pages) components.set(name, (await server.ssrLoadModule(`/src/views/${name}.vue`)).default)
      const router = createRouter({ history: createMemoryHistory(), routes: [
        ...pages.map(name => ({ path: `/${name}`, component: components.get(name) })),
        { path: '/profile', name: 'Profile', component: components.get('ProfileView') },
        { path: '/projects', name: 'ProjectList', component: components.get('ProjectListView') },
        { path: '/projects/:id', name: 'ProjectDetail', component: components.get('ProjectDetailView') },
      ] })
      const render = async (path, appPinia = pinia) => {
        const app = createSSRApp(RouterView).use(appPinia).use(router)
        await router.push(path)
        return renderToString(app)
      }
      for (const name of ['HomeView', 'ProfileView', 'AdminProfileView']) {
        assert.ok((await render(`/${name}`)).includes('新的姓名'))
      }
      for (const name of ['HomeView', 'ContactView']) {
        assert.ok((await render(`/${name}`)).includes('shared@example.com'))
      }
      projects.saveProject({ ...projects.projects[0], name: '页面共享项目' })
      for (const path of ['/ProjectListView', '/projects/7', '/AdminProjectsView']) {
        assert.ok((await render(path)).includes('页面共享项目'))
      }
      assert.ok((await render('/projects/999')).includes('项目不存在'))
      const skillsHtml = await render('/SkillsView')
      assert.ok(skillsHtml.includes('Vue 3'))
      assert.ok(!skillsHtml.includes('JavaScript'))

      // 模拟刷新：创建全新 Pinia，实际页面也应显示已保存内容和筛选结果。
      const restoredPinia = createPinia()
      assert.ok((await render('/HomeView', restoredPinia)).includes('新的姓名'))
      assert.ok((await render('/ContactView', restoredPinia)).includes('shared@example.com'))
      assert.ok((await render('/projects/7', restoredPinia)).includes('页面共享项目'))
      assert.ok(!(await render('/SkillsView', restoredPinia)).includes('JavaScript'))
      profile.setKeyword('')
      assert.equal(useProfileStore(createPinia()).keyword, '')
      assert.ok((await render('/SkillsView', createPinia())).includes('JavaScript'))
    })

    await t.test('malformed profile, keyword and user storage falls back safely', () => {
      for (const raw of ['{broken', 'null', '42', '{"username":"unknown"}']) {
        storage.set('homepage-profile', raw)
        storage.set('homepage-skill-keyword', raw)
        storage.set('homepage-user', raw)
        const restoredPinia = createPinia()
        assert.equal(useProfileStore(restoredPinia).profile.name, defaultProfile.name)
        assert.equal(useProfileStore(restoredPinia).keyword, '')
        assert.equal(useUserStore(restoredPinia).isAuthenticated, false)
      }
    })
  } finally {
    await server.close()
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  }
})
