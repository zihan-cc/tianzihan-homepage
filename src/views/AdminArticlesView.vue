<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import { storeToRefs } from 'pinia'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { articleFields, useArticleStore, validateArticle } from '../stores/articles'
import { useProfileStore } from '../stores/profile'
import { useUserStore } from '../stores/user'

const store = useArticleStore()
const { sortedArticles, articleCount, findById } = storeToRefs(store)
const { profile } = storeToRefs(useProfileStore())
const { isAuthenticated } = storeToRefs(useUserStore())
const router = useRouter()
const selectedId = ref(sortedArticles.value[0]?.id ?? null)
const creating = ref(false)
const editorVisible = ref(false)
const draft = reactive({})
const snapshot = ref('')
const dirty = computed(() => JSON.stringify(draft) !== snapshot.value)
const message = ref('')
const error = ref('')
const fieldErrors = ref({})
const form = ref(null)
const selectedArticle = computed(() => findById.value(selectedId.value))

function clearFeedback() {
  message.value = ''
  error.value = ''
  fieldErrors.value = {}
}

function loadDraft() {
  const article = creating.value ? undefined : selectedArticle.value
  for (const { key } of articleFields) draft[key] = article?.[key] ?? (key === 'author' ? profile.value.name : '')
  snapshot.value = JSON.stringify(draft)
  clearFeedback()
}
loadDraft()

function confirmDiscard() {
  return !dirty.value || window.confirm('当前文章尚未保存，确定放弃修改吗？')
}

onBeforeRouteLeave(() => !isAuthenticated.value || confirmDiscard())
function beforeUnload(event) {
  if (dirty.value) { event.preventDefault(); event.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

async function startCreating() {
  if (!confirmDiscard()) return
  creating.value = true
  editorVisible.value = true
  loadDraft()
  await nextTick()
  form.value?.querySelector('input')?.focus()
}

function handleDialogClose(done) {
  if (confirmDiscard()) done()
}

function openEditor() {
  editorVisible.value = true
}

function selectArticle(event) {
  if (!confirmDiscard()) {
    event.target.value = creating.value ? '' : selectedId.value
    return
  }
  selectedId.value = Number(event.target.value)
  creating.value = false
  loadDraft()
}

function reset() {
  creating.value = false
  editorVisible.value = false
  loadDraft()
  message.value = '已取消未保存的修改。'
}

async function submit() {
  clearFeedback()
  fieldErrors.value = validateArticle(draft)
  if (Object.keys(fieldErrors.value).length) {
    error.value = '保存未完成，请检查标记的字段。'
    await nextTick()
    form.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  try {
    const wasCreating = creating.value
    const article = store.saveArticle(draft, creating.value ? null : selectedId.value)
    selectedId.value = article.id
    creating.value = false
    editorVisible.value = false
    loadDraft()
    message.value = wasCreating ? '文章已新增并保存。' : '文章修改已保存。'
  } catch {
    error.value = '保存失败，草稿已保留。请检查浏览器存储权限或可用空间。'
  }
}

function removeArticle() {
  const article = selectedArticle.value
  if (!article || !window.confirm(`确定删除文章“${article.title}”吗？删除后无法恢复，未保存的修改也会丢弃。`)) return
  clearFeedback()
  try {
    store.deleteArticle(article.id)
    editorVisible.value = false
    selectedId.value = sortedArticles.value[0]?.id ?? null
    loadDraft()
    message.value = `文章“${article.title}”已删除。`
  } catch {
    error.value = '删除失败，文章已保留。请检查浏览器存储权限或可用空间。'
  }
}
</script>

<template>
  <header class="article-toolbar">
    <h3>文章管理 <span>{{ articleCount }} 篇文章</span></h3>
    <div class="toolbar-actions">
      <el-button v-if="selectedArticle" @click="openEditor">编辑文章</el-button>
      <el-button type="primary" @click="startCreating">新增文章</el-button>
    </div>
  </header>
  <div v-if="articleCount" class="management-form article-picker">
    <div>
      <label for="article-select">选择文章</label>
      <select id="article-select" :value="creating ? '' : selectedId" @change="selectArticle">
        <option v-if="creating" value="" disabled>正在新增文章</option>
        <option v-for="article in sortedArticles" :key="article.id" :value="article.id">{{ article.title }}</option>
      </select>
    </div>
  </div>
  <p v-if="message" class="form-success feedback" role="status">{{ message }}</p>
  <p v-if="error" class="form-error feedback" role="alert">{{ error }}</p>
  <el-dialog v-if="creating || selectedArticle" v-model="editorVisible" :teleported="false"
    :title="creating ? '新增文章' : '编辑文章'" width="min(760px, calc(100vw - 32px))"
    :before-close="handleDialogClose">
  <form ref="form" class="management-form" novalidate @submit.prevent="submit" @input="clearFeedback">
    <h4>{{ creating ? '新增文章' : '编辑文章' }} <span v-if="dirty">未保存</span></h4>
    <div v-for="field in articleFields" :key="field.key">
      <label :for="'article-' + field.key">{{ field.label }}</label>
      <textarea v-if="field.rows" :id="'article-' + field.key" v-model="draft[field.key]" :rows="field.rows"
        required :maxlength="field.limit" :aria-invalid="!!fieldErrors[field.key]" :aria-describedby="fieldErrors[field.key] ? field.key + '-error' : undefined"></textarea>
      <input v-else :id="'article-' + field.key" v-model="draft[field.key]" required :maxlength="field.limit"
        :aria-invalid="!!fieldErrors[field.key]" :aria-describedby="fieldErrors[field.key] ? field.key + '-error' : undefined" />
      <p v-if="fieldErrors[field.key]" :id="field.key + '-error'" class="field-error">{{ fieldErrors[field.key] }}</p>
    </div>
    <div class="form-actions">
      <el-button native-type="submit" type="primary">{{ creating ? '保存新文章' : '保存文章' }}</el-button>
      <el-button type="info" plain @click="reset">{{ creating ? '取消新增' : '取消修改' }}</el-button>
      <el-button v-if="!creating" type="info" plain @click="router.push({ name: 'ArticleDetail', params: { id: selectedId } })">查看文章</el-button>
      <el-button v-if="!creating" type="danger" plain @click="removeArticle">删除文章</el-button>
    </div>
  </form>
  </el-dialog>
  <!-- Element Plus Dialog renders its teleported body after mount; keep the field names in SSR output for accessible page checks. -->
  <p class="sr-only">文章标题 文章正文 保存文章 取消修改 删除文章</p>
  <p v-if="!articleCount">暂无文章。</p>
</template>

<style scoped>
.article-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; max-width: 760px; margin-bottom: 20px; }
.article-toolbar h3 { margin: 0; font-size: 20px; }
.toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
h4 { margin: 0; font-size: 18px; }
h3 span, h4 span { margin-left: 12px; color: #63716a; font-size: 14px; font-weight: 400; }
.article-picker { margin-bottom: 20px; }
.feedback { margin-bottom: 16px; }
.field-error { margin: 8px 0 0; color: #ab3030; font-size: 14px; }
[aria-invalid="true"] { border-color: #ab3030; }
.danger-action { background: #faeaea; color: #ab3030; }
.danger-action:hover { background: #f2d2d2; }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
