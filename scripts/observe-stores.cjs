const { chromium } = require(process.argv[2] || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

async function main() {
  const output = path.resolve(__dirname, '../docs/devtools')
  fs.mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    // 独立浏览器上下文，不读取或修改日常浏览器中的实验数据。
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
    const app = await context.newPage()
    app.on('dialog', dialog => dialog.accept())
    await app.goto('http://127.0.0.1:5173/#/home')
    await app.locator('#contact').waitFor()
    const route = async hash => {
      await app.evaluate(value => { location.hash = value }, hash)
      await app.waitForFunction(value => document.querySelector('#app').__vue_app__.config.globalProperties.$route.path === value, hash)
    }
    // 文章 Store 按需创建，先进入文章页，再观察四个 Store。
    await route('/articles')
    await app.locator('a[href="#/articles/1"]').first().waitFor()
    await app.evaluate(() => {
      window.__storeObservations = []
      const pinia = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia
      for (const store of pinia._s.values()) {
        store.$onAction(({ name, after, onError }) => {
          // 不记录参数，避免把登录密码写入观察文件。
          const event = { store: store.$id, action: name, result: 'started' }
          window.__storeObservations.push(event)
          after(() => { event.result = 'completed' })
          onError(() => { event.result = 'error' })
        }, true)
      }
    })
    const state = () => app.evaluate(() => JSON.parse(JSON.stringify(
      document.querySelector('#app').__vue_app__.config.globalProperties.$pinia.state.value)))
    const panel = await context.newPage()
    await panel.goto('http://127.0.0.1:5173/__devtools__/')
    await panel.locator('a[href="/pinia"]').click()
    const inspect = async (id, filename) => {
      await panel.getByText('Store', { exact: true }).click()
      await panel.getByText(id, { exact: true }).first().click()
      await panel.waitForFunction(() => document.body.innerText.includes('state') || document.body.innerText.includes('No Data'))
      await panel.waitForTimeout(500)
      const text = await panel.locator('body').innerText()
      await panel.screenshot({ path: path.join(output, filename + '.png'), fullPage: true })
      return text
    }
    const report = { initial: await state(), observations: [], inspectors: {}, timelineSamples: [] }
    assert.deepEqual(Object.keys(report.initial).sort(), ['articles', 'profile', 'projects', 'user'])
    // Timeline 的事件保存在面板组件内；独立标签保持录制，查看 Store 时不卸载它。
    const timelinePanel = await context.newPage()
    await timelinePanel.setViewportSize({ width: 1440, height: 2800 })
    await timelinePanel.goto('http://127.0.0.1:5173/__devtools__/')
    await timelinePanel.locator('a[href="/pinia"]').click()
    await timelinePanel.getByText('Timeline', { exact: true }).click()
    await timelinePanel.locator('.recording-btn').click()
    const sampleTimeline = async () => {
      await timelinePanel.waitForTimeout(200)
      report.timelineSamples.push(await timelinePanel.locator('body').innerText())
    }

    await route('/skills')
    await app.locator('#keyword').fill('Vue')
    assert.equal((await state()).profile.keyword, 'Vue')
    await route('/home')
    assert.equal(await app.locator('#keyword').inputValue(), 'Vue')
    report.observations.push('技能关键词 Vue 跨首页和技能页共享。')
    report.inspectors.profileSearch = await inspect('profile', '01-profile-search')
    await sampleTimeline()

    await app.evaluate(() => { location.hash = '/admin/profile' })
    await app.locator('#username').waitFor()
    await app.locator('#username').fill('admin')
    await app.locator('#password').fill('123456')
    await app.getByRole('button', { name: '登录', exact: true }).click()
    await app.locator('#profile-name').waitFor()
    assert.deepEqual((await state()).user.currentUser, { username: 'admin' })
    report.inspectors.user = await inspect('user', '02-user-login')
    await sampleTimeline()
    const originalName = (await state()).profile.profile.name
    await app.locator('#profile-name').fill('DevTools 实验观察')
    assert.equal((await state()).profile.profile.name, originalName)
    await app.getByRole('button', { name: '保存资料', exact: true }).click()
    assert.equal((await state()).profile.profile.name, 'DevTools 实验观察')
    report.observations.push('个人资料草稿输入未改变 Store；保存后姓名和网站标题同步更新。')
    await sampleTimeline()
    await timelinePanel.screenshot({ path: path.join(output, '06-login-profile-actions.png'), fullPage: true })

    await route('/admin/projects')
    await app.getByRole('button', { name: '新增项目', exact: true }).click()
    for (const [key, value] of Object.entries({ name: 'DevTools 观察项目', category: '实验四', summary: '观察项目共享状态', technologies: 'Vue 3, Pinia', description: '使用 DevTools 查看项目状态与 action 调用。', features: '状态共享\n本地持久化' })) {
      await app.locator('#project-' + key).fill(value)
    }
    assert.equal((await state()).projects.projects.length, 2)
    await app.getByRole('button', { name: '保存新项目', exact: true }).click()
    assert.equal((await state()).projects.projects.length, 3)
    await sampleTimeline()
    await app.getByRole('button', { name: '编辑项目', exact: true }).click()
    await app.locator('#project-name').fill('DevTools 观察项目（已修改）')
    await app.getByRole('button', { name: '保存项目', exact: true }).click()
    report.inspectors.projects = await inspect('projects', '03-projects-saved')
    await sampleTimeline()
    assert.equal((await state()).projects.projects[2].name, 'DevTools 观察项目（已修改）')
    await app.getByRole('button', { name: '编辑项目', exact: true }).click()
    await app.getByRole('button', { name: '删除项目', exact: true }).click()
    assert.equal((await state()).projects.projects.length, 2)
    assert.equal((await state()).projects.lastId, 3)
    report.observations.push('项目新增 2→3 条，修改保持 3 条，删除恢复 2 条，lastId 保留 3。')

    await route('/admin/articles')
    await app.getByRole('button', { name: '新增文章', exact: true }).click()
    for (const [key, value] of Object.entries({ title: 'DevTools 观察文章', category: '实验四', author: '实验观察', summary: '观察文章状态', content: '通过文章新增、修改和删除观察 Pinia 状态。' })) {
      await app.locator('#article-' + key).fill(value)
    }
    await app.getByRole('button', { name: '保存新文章', exact: true }).click()
    assert.equal((await state()).articles.articles.length, 3)
    await app.getByRole('button', { name: '编辑文章', exact: true }).click()
    await app.locator('#article-title').fill('DevTools 观察文章（已修改）')
    await app.getByRole('button', { name: '保存文章', exact: true }).click()
    report.inspectors.articles = await inspect('articles', '04-articles-saved')
    await app.getByRole('button', { name: '编辑文章', exact: true }).click()
    await app.getByRole('button', { name: '删除文章', exact: true }).click()
    assert.equal((await state()).articles.articles.length, 2)
    assert.equal((await state()).articles.lastId, 3)
    report.observations.push('文章新增与修改均调用 saveArticle，删除后 lastId 保留 3。')

    await app.getByRole('button', { name: '退出登录', exact: true }).click()
    assert.equal((await state()).user.currentUser, null)
    await timelinePanel.waitForTimeout(500)
    await sampleTimeline()
    report.timeline = report.timelineSamples.join('\n\n--- successive viewport samples ---\n\n')
    await timelinePanel.screenshot({ path: path.join(output, '05-actions-timeline.png'), fullPage: true })
    report.actions = await app.evaluate(() => window.__storeObservations)
    for (const name of ['setKeyword', 'login', 'logout', 'saveProfile', 'addProject', 'saveProject', 'deleteProject', 'saveArticle', 'deleteArticle']) {
      assert(report.actions.some(event => event.action === name && event.result === 'completed'), name)
      assert(report.timeline.includes(name), 'DevTools Timeline: ' + name)
    }
    await app.reload()
    await route('/home')
    await app.locator('#keyword').waitFor()
    const restored = await state()
    assert.equal(restored.profile.keyword, 'Vue')
    assert.equal(restored.profile.profile.name, 'DevTools 实验观察')
    assert.equal(restored.projects.lastId, 3)
    assert.equal(restored.user.currentUser, null)
    report.observations.push('刷新后关键词、资料和项目编号恢复，退出后的用户仍为 null。')
    fs.writeFileSync(path.join(output, 'observations.json'), JSON.stringify(report, null, 2) + '\n')
    console.log(JSON.stringify({ observations: report.observations, actions: report.actions, screenshots: output }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
