<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { getLoginDestination } from '../router/auth'

const userStore = useUserStore()

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

const destination = computed(() => getLoginDestination(router, route.query.redirect))

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    if (!userStore.login(username.value.trim(), password.value)) {
      error.value = '用户名或密码错误。'
      return
    }
    await router.replace(destination.value)
  } catch {
    error.value = '登录失败，请检查浏览器的本地存储权限或可用空间。'
  } finally {
    password.value = ''
    submitting.value = false
  }
}
</script>

<template>
  <section class="login-panel" aria-labelledby="login-heading">
    <h2 id="login-heading">身份认证</h2>
    <form class="management-form" @submit.prevent="submit">
      <div>
        <label for="username">用户名</label>
        <input id="username" v-model="username" autocomplete="username" required maxlength="40" />
      </div>
      <div>
        <label for="password">密码</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" required maxlength="100" />
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <button type="submit" :disabled="submitting">{{ submitting ? '正在登录…' : '登录' }}</button>
    </form>
  </section>
</template>

<style scoped>
.login-panel {
  width: min(480px, 100%);
  margin: 0 auto;
  padding: 24px;
  background: #fff;
  border: 1px solid #dfe9e5;
  border-radius: 8px;
}

.login-panel h2 {
  margin: 0 0 24px;
  font-size: 24px;
}
</style>
