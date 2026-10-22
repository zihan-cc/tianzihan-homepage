<script setup>
import { reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '../stores/profile'

const store = useProfileStore()
const { profile } = storeToRefs(store)

const draft = reactive({ ...profile.value })
const message = ref('')
const error = ref('')

function reset() {
  Object.assign(draft, profile.value)
  message.value = '已取消未保存的修改。'
  error.value = ''
}

function submit() {
  message.value = ''
  error.value = ''
  const next = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()]))
  if (['name', 'majorClass', 'direction', 'introduction', 'goal', 'email'].some((key) => !next[key])) {
    error.value = '请填写所有必填内容，不能只输入空格。'
    return
  }
  try {
    store.saveProfile(next)
    Object.assign(draft, profile.value)
    message.value = '个人资料已保存。'
  } catch {
    error.value = '保存失败，请检查浏览器是否允许本地存储或存储空间是否已满。'
  }
}
</script>

<template>
  <h3>编辑个人资料</h3>
  <form class="management-form" @submit.prevent="submit" @input="message = ''; error = ''">
    <div class="form-grid">
      <div><label for="profile-name">姓名</label><input id="profile-name" v-model="draft.name" required maxlength="40" /></div>
      <div><label for="profile-class">专业班级</label><input id="profile-class" v-model="draft.majorClass" required maxlength="80" /></div>
      <div><label for="profile-direction">学习方向</label><input id="profile-direction" v-model="draft.direction" required maxlength="80" /></div>
      <div><label for="profile-email">邮箱</label><input id="profile-email" v-model="draft.email" type="email" required maxlength="160" /></div>
    </div>
    <div><label for="profile-introduction">个人简介</label><textarea id="profile-introduction" v-model="draft.introduction" rows="4" required maxlength="1000"></textarea></div>
    <div><label for="profile-goal">学习目标</label><textarea id="profile-goal" v-model="draft.goal" rows="3" required maxlength="500"></textarea></div>
    <p v-if="message" class="form-success" role="status">{{ message }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="form-actions">
      <button type="submit">保存资料</button>
      <button type="button" class="secondary-action" @click="reset">取消修改</button>
      <RouterLink :to="{ name: 'Profile' }">查看个人主页</RouterLink>
    </div>
  </form>
</template>
