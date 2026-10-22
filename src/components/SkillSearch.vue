<script setup>
const props = defineProps({ filteredSkills: { type: Array, required: true } });
const keyword = defineModel({ type: String, required: true });
</script>
<template>
  <section id="skills" class="card">
    <h2>技能搜索</h2>
    <label for="keyword">关键词：</label>
    <input id="keyword" v-model.trim="keyword" type="text" placeholder="请输入技能名称" />
    <p>共找到 {{ props.filteredSkills.length }} 项技能</p>
    <ul v-if="props.filteredSkills.length" class="item-list">
      <li v-for="skill in props.filteredSkills" :key="skill.id">
        {{ skill.name }}，熟悉程度：{{ skill.level }}
      </li>
    </ul>
    <p v-else class="empty">没有找到匹配的技能。</p>
  </section>
</template>
<style scoped>
.empty {
  color: #f2dcb7;
}
</style>
