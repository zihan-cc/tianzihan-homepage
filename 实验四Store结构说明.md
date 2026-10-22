# 实验四：共享状态与 Store 划分

## 项目结构分析

`src/views` 保存路由页面，`src/components` 保存可复用的展示组件，`src/router` 管理路由。
原先的个人资料、技能搜索、项目和登录状态由 `src/data` 中模块级的 `reactive/ref` 保存。
这些数据会被多个页面使用，因此迁移到 Pinia，统一维护数据来源和修改入口。

现在 `src/data` 只负责默认内容、纯校验规则和浏览器存储适配；`src/stores` 负责共享状态、派生数据和业务操作。

## Store 职责

| 文件 / Store ID | state：共享状态 | getters：派生数据 | actions：业务操作 |
| --- | --- | --- | --- |
| `src/stores/user.js` / `user` | `currentUser` 当前登录用户 | `isAuthenticated` 是否登录、`username` 用户名 | `login` 登录、`logout` 退出 |
| `src/stores/profile.js` / `profile` | `profile` 个人资料、`skills` 技能、`interests` 爱好、`keyword` 技能关键词 | `siteTitle` 网站标题、`skillCount` 技能数量、`filteredSkills` 筛选结果 | `saveProfile` 保存资料、`setKeyword` 更新关键词 |
| `src/stores/projects.js` / `projects` | `projects` 项目列表、`lastId` 已使用的最大编号 | `projectCount` 数量、`categories` 分类、`findProjectById` 按编号查询 | `addProject` 新增、`saveProject` 修改、`deleteProject` 删除 |
| `src/stores/articles.js` / `articles` | `articles` 文章列表、`lastId` 已使用的最大编号 | `sortedArticles` 排序列表、`articleCount` 数量、`categories` 分类、`findById` 查询 | `saveArticle` 新增或修改、`deleteArticle` 删除 |

文章 Store 沿用现有实现，其余三个 Store 是本次新增。
个人资料、技能和爱好共同属于个人主页内容，因此由同一个 Store 管理。
技能关键词原本就在首页与独立技能页之间共享，迁移后继续保持这一行为。

## 页面如何接入

- `App.vue`：读取个人资料、网站标题和登录状态，驱动公共页头和浏览器标题。
- 首页、个人信息页、联系页、资料管理页：使用个人主页 Store，保存资料后同步显示。
- 技能页、兴趣页：使用个人主页 Store；技能过滤由 getter 计算，关键词通过 action 更新。
- 项目列表、详情、项目管理页：使用项目 Store，管理页通过 actions 修改数据。
- 登录页、后台布局和文章管理页：使用用户 Store 获取登录状态或执行登录、退出。
- 路由守卫：由 `createAppRouter(pinia)` 绑定当前应用，在回调内部调用 `useUserStore(pinia)`，统一检查后台父子路由的认证要求。
- 文章页面：继续使用文章 Store，文章管理页的默认作者来自个人资料 Store。

`main.js` 先创建 `pinia` 并传入 `createAppRouter(pinia)`，再通过 `.use(pinia).use(router)` 注册，确保路由和组件读取相同的状态。

## state、getters、actions 的使用示例

```js
const store = useProjectStore()
const { projects, projectCount } = storeToRefs(store)

// projects 来自 state；projectCount 来自 getter。
// 修改共享数据通过 action 完成。
store.addProject(draft)
```

使用 `storeToRefs` 解构 state 和 getters，保持响应式。
根据路由参数查询详情时，查询 getter 也通过 `storeToRefs` 解构：

```js
const { projects, findProjectById } = storeToRefs(store)
const project = computed(() => findProjectById.value(route.params.id))
```

脚本中通过 `.value` 读取 ref；模板中直接使用变量名，Vue 会自动解包。
查询 getter 返回函数，因此脚本中使用 `findProjectById.value(id)` 调用。
配合 `computed`，路由编号变化、项目修改或删除时，详情会同步更新。

本项目中个人资料、技能、兴趣、项目列表、文章列表、数量、分类、登录状态以及查询 getter，
均通过 `storeToRefs` 在需要读取它们的组件中解构。
技能关键词也通过 `storeToRefs` 获取，并用可写计算属性连接 `v-model`，写入时调用 `setKeyword` action。
`login`、`logout`、`saveProfile` 等 actions 直接通过 Store 调用，不传入 `storeToRefs`。

不能写成 `const { projectCount } = store` 来提取响应式数据，这会取得当前值而失去后续关联。
直接访问 `store.projectCount` 本身仍具有响应式；需要解构时才使用 `storeToRefs`。

表单草稿、字段错误、保存提示、当前选择项等仍保留在组件内部。
编辑草稿是已保存数据的副本，点击保存后才调用 action，避免未保存内容提前影响前台页面。
`ProfileCard`、`SkillSearch`、`SiteHeader` 等展示组件继续通过 props 或事件通信。

## 跨组件、跨页面共享与 localStorage 持久化

同一个应用通过 `main.js` 注册一个 Pinia 实例，各页面调用同一个 `useXxxStore()` 时取得同一个 Store。
页面通过 `storeToRefs` 读取共享状态，通过 actions 修改状态，因此其他消费者会同步更新。

| 共享数据 | 共同使用的页面或组件 | localStorage 键 |
| --- | --- | --- |
| 个人资料 | 页头、首页资料卡、个人信息页、联系页、资料管理页、文章管理页默认作者 | `homepage-profile` |
| 项目列表 | 首页项目区、项目列表页、详情页、项目管理页 | `homepage-projects` |
| 项目编号计数 | 项目管理的新增与删除操作 | `homepage-project-last-id` |
| 文章列表与编号计数 | 文章列表、详情、文章管理页 | `homepage-articles` |
| 当前用户 | 页头登录入口、后台、登录页、文章编辑离开判断、路由守卫 | `homepage-user` |
| 技能搜索关键词 | 首页技能模块、独立技能页 | `homepage-skill-keyword` |

Store 的 state 初始化时调用 `loadStoredData`，用 `JSON.parse` 读取、校验数据；
actions 保存成功后用 `JSON.stringify` 写入 localStorage，再更新共享状态。
读取失败、JSON 损坏或结构不合法时使用默认值；写入失败时页面显示提示，避免将未保存内容显示为保存成功。
退出登录会删除 `homepage-user`，刷新后保持未登录；若删除失败，则提示用户退出未完成。

技能与爱好目前是固定展示内容，直接从默认数据初始化；数量、标题和筛选结果等 getters 根据恢复后的状态计算。
未提交的表单草稿、字段错误、提示文字和当前选择项属于页面局部状态，不写入存储。

### 手动验收

1. 后台修改姓名和邮箱并保存，查看页头、首页、个人信息页和联系页，确认内容一致；刷新后仍显示新内容。
2. 后台新增、编辑或删除项目及文章，切换到对应列表与详情页；刷新后确认结果仍然保留。
3. 首页技能区输入 `vue`，切换到技能页，确认关键词和筛选结果一致；刷新后仍然保留，清空后刷新恢复全部技能。
4. 登录后刷新或关闭再打开网站，确认页头及后台恢复登录状态；退出后刷新，确认后台再次要求登录。
5. 在浏览器开发者工具的 Application → Local Storage 中查看上述键，观察保存与删除结果。

## 兼容已有数据

- 项目和个人资料保留原来的 localStorage 键及数据格式，继续读取已有内容。
- 文章保留原来的 localStorage 持久化实现。
- 用户登录改用 localStorage；课堂演示账号仍为 `admin / 123456`，密码不存入 Store 或本地存储。
- 保存先写入浏览器存储，成功后再更新响应式状态；写入失败时保留当前数据。
- 项目编号保留计数，删除后不会复用已有编号。
- 搜索关键词在路由切换、刷新和重新打开网站后保留。

## 验证方式

运行 `node --test tests/*.test.mjs` 验证 Store 操作、存储兼容、页面渲染和共享更新；
运行 `npm.cmd run build` 验证整个项目可以构建。

浏览器中还可打开 Vue DevTools 的 Pinia 面板，查看 `user`、`profile`、`projects`、`articles`，
通过登录、搜索、保存资料和编辑内容观察 state、getters 与 actions 的变化。
