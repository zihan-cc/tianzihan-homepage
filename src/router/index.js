import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ProfileView from '../views/ProfileView.vue'
import SkillsView from '../views/SkillsView.vue'
import InterestsView from '../views/InterestsView.vue'
import ContactView from '../views/ContactView.vue'
import NotFoundView from '../views/NotFoundView.vue'
import ProjectsView from '../views/ProjectsView.vue'
import ProjectListView from '../views/ProjectListView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import AdminProfileView from '../views/AdminProfileView.vue'
import AdminProjectsView from '../views/AdminProjectsView.vue'
import ArticlesView from '../views/ArticlesView.vue'
import ArticleListView from '../views/ArticleListView.vue'
import ArticleDetailView from '../views/ArticleDetailView.vue'
import AdminArticlesView from '../views/AdminArticlesView.vue'
import { useArticleStore } from '../stores/articles'
import { useUserStore } from '../stores/user'
import { useProjectStore } from '../stores/projects'
import { getLoginDestination } from './auth'

// 每个应用绑定自己的 Pinia；测试时可以传入内存路由验证相同的路由与守卫。
export default function createAppRouter(pinia, history = createWebHashHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', redirect: { name: 'Home' } },
      { path: '/home', name: 'Home', component: HomeView, meta: { title: '首页' } },
      { path: '/profile', name: 'Profile', component: ProfileView, meta: { title: '基本信息' } },
      { path: '/skills', name: 'Skills', component: SkillsView, meta: { title: '技能搜索' } },
      { path: '/interests', name: 'Interests', component: InterestsView, meta: { title: '兴趣爱好' } },
      { path: '/contact', name: 'Contact', component: ContactView, meta: { title: '联系信息' } },
      { path: '/login', name: 'Login', component: LoginView, meta: { title: '身份认证' } },
      {
        path: '/admin',
        name: 'Admin',
        component: AdminView,
        redirect: { name: 'AdminProfile' },
        meta: { title: '后台管理', requiresAuth: true },
        children: [
          { path: 'profile', name: 'AdminProfile', component: AdminProfileView, meta: { title: '编辑个人资料' } },
          { path: 'projects', name: 'AdminProjects', component: AdminProjectsView, meta: { title: '编辑项目信息' } },
          { path: 'articles', name: 'AdminArticles', component: AdminArticlesView, meta: { title: '文章管理' } },
        ],
      },
      {
        path: '/projects',
        name: 'Projects',
        component: ProjectsView,
        redirect: { name: 'ProjectList' },
        meta: { title: '项目中心' },
        children: [
          { path: '', name: 'ProjectList', component: ProjectListView, meta: { title: '项目中心' } },
          {
            path: ':id', name: 'ProjectDetail', component: ProjectDetailView,
            meta: { title: (route) => useProjectStore(pinia).findProjectById(route.params.id)?.name || '项目不存在' },
          },
        ],
      },
      {
        path: '/articles', name: 'Articles', component: ArticlesView,
        redirect: { name: 'ArticleList' }, meta: { title: '学习文章' },
        children: [
          { path: '', name: 'ArticleList', component: ArticleListView, meta: { title: '文章列表' } },
          {
            path: ':id', name: 'ArticleDetail', component: ArticleDetailView,
            meta: { title: route => useArticleStore(pinia).findById(route.params.id)?.title || '文章不存在' },
          },
        ],
      },
      { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundView, meta: { title: '404 · 页面不存在' } },
    ],
    scrollBehavior(to, from, savedPosition) {
      return savedPosition || { top: 0 }
    },
  })

  router.beforeEach((to) => {
    // 在守卫内部获取当前应用的用户 Store，不在模块顶层创建 Store。
    const userStore = useUserStore(pinia)
    // 检查整条匹配记录，后台父路由的认证要求覆盖所有子页面。
    if (to.matched.some(record => record.meta.requiresAuth) && !userStore.isAuthenticated) {
      return { name: 'Login', query: { redirect: to.fullPath }, replace: true }
    }
    if (to.name === 'Login' && userStore.isAuthenticated) {
      return getLoginDestination(router, to.query.redirect)
    }
  })

  return router
}
