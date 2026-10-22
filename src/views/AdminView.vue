<script setup>
import { ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const error = ref('')
function signOut() {
  error.value = ''
  try {
    userStore.logout()
  } catch {
    error.value = '退出失败，无法清除保存的登录状态，请检查浏览器的本地存储权限。'
    return
  }
  router.replace({ name: 'Login' })
}
</script>

<template>
  <section aria-labelledby="admin-heading">
    <header class="admin-heading">
      <h2 id="admin-heading">后台管理</h2>
      <button class="secondary-action" type="button" @click="signOut">退出登录</button>
    </header>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <nav class="admin-nav" aria-label="后台管理导航">
      <RouterLink :to="{ name: 'AdminProfile' }">个人资料</RouterLink>
      <RouterLink :to="{ name: 'AdminProjects' }">项目信息</RouterLink>
      <RouterLink :to="{ name: 'AdminArticles' }">文章管理</RouterLink>
    </nav>
    <RouterView />
  </section>
</template>

<style scoped>
.admin-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.admin-heading h2 {
  margin: 0;
  font-size: 24px;
}

.admin-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin: 20px 0 24px;
  border-bottom: 1px solid #c9d8d2;
}

.admin-nav a {
  padding: 12px 0;
  color: #52635b;
  text-decoration: none;
  border-bottom: 3px solid transparent;
}

.admin-nav a.router-link-exact-active {
  color: #28734f;
  border-bottom-color: #28734f;
  font-weight: 700;
}
</style>
