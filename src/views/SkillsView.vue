<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import SkillSearch from '../components/SkillSearch.vue'
import { useProfileStore } from '../stores/profile'

const store = useProfileStore()
const { keyword, filteredSkills, skillCount } = storeToRefs(store)
const error = ref('')
// 读取解构后的 ref，写入仍通过 action，保留统一的状态修改入口。
const keywordModel = computed({
  get: () => keyword.value,
  set: value => {
    error.value = ''
    try {
      store.setKeyword(value)
    } catch {
      error.value = '关键词未保存，请检查浏览器的本地存储权限或可用空间。'
    }
  },
})
watch(keyword, (n, o) => console.log(`搜索关键词由“${o}”变为“${n}”`))
onMounted(() => console.log('当前技能数量：', skillCount.value))
</script>

<template>
  <SkillSearch v-model="keywordModel" :filtered-skills="filteredSkills" />
  <p v-if="error" class="form-error" role="alert">{{ error }}</p>
</template>
