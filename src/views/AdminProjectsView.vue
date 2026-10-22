<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElButton, ElDialog } from 'element-plus'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useProjectStore, validateProject } from '../stores/projects'
import { useUserStore } from '../stores/user'

const store = useProjectStore()
const { projects, projectCount, findProjectById } = storeToRefs(store)
const { isAuthenticated } = storeToRefs(useUserStore())

const router = useRouter()
const selectedId = ref(projects.value[0]?.id ?? null)
const selectedProject = computed(() => findProjectById.value(selectedId.value))
const isCreating = ref(false)
const editorVisible = ref(false)
const draft = reactive(emptyDraft())
const originalDraft = ref('')
const isDirty = computed(() => JSON.stringify(draft) !== originalDraft.value)
const message = ref('')
const error = ref('')
const fieldErrors = ref({})
const form = ref(null)
const covers = [
  { value: '', label: '无封面' },
  { value: 'images/profile-project.png', label: '个人主页截图' },
  { value: 'images/skills-project.png', label: '技能搜索截图' },
]

function emptyDraft() {
  return { name: '', category: '', summary: '', description: '', technologies: '', features: '', cover: '' }
}

function clearFeedback() {
  message.value = ''
  error.value = ''
  fieldErrors.value = {}
}

function loadDraft() {
  const project = selectedProject.value
  Object.assign(draft, project && !isCreating.value ? {
    name: project.name, category: project.category, summary: project.summary,
    description: project.description, technologies: project.technologies.join(', '),
    features: project.features.join('\n'), cover: project.cover,
  } : emptyDraft())
  originalDraft.value = JSON.stringify(draft)
  clearFeedback()
}
loadDraft()

function confirmDiscard() {
  return !isDirty.value || window.confirm('当前内容尚未保存，确定放弃这些修改吗？')
}

onBeforeRouteLeave(() => !isAuthenticated.value || confirmDiscard())
function beforeUnload(event) {
  if (isDirty.value) { event.preventDefault(); event.returnValue = '' }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

function selectProject(event) {
  if (!confirmDiscard()) {
    event.target.value = isCreating.value ? '' : selectedId.value ?? ''
    return
  }
  selectedId.value = Number(event.target.value)
  isCreating.value = false
  loadDraft()
}

async function startCreating() {
  if (!confirmDiscard()) return
  isCreating.value = true
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

function reset() {
  isCreating.value = false
  editorVisible.value = false
  loadDraft()
  message.value = '已取消未保存的修改。'
}

async function submit() {
  clearFeedback()
  if (!isCreating.value && !selectedProject.value) return
  const next = {
    ...(isCreating.value ? {} : selectedProject.value),
    name: draft.name.trim(), category: draft.category.trim(), summary: draft.summary.trim(),
    description: draft.description.trim(), cover: draft.cover,
    technologies: draft.technologies.split(/[,，]/).map(text => text.trim()).filter(Boolean),
    features: draft.features.split(/\r?\n/).map(text => text.trim()).filter(Boolean),
  }
  fieldErrors.value = validateProject(next)
  if (Object.keys(fieldErrors.value).length) {
    error.value = '保存未完成，请检查标记的字段。'
    await nextTick()
    form.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  try {
    const creating = isCreating.value
    if (creating) selectedId.value = store.addProject(next).id
    else store.saveProject(next)
    isCreating.value = false
    editorVisible.value = false
    loadDraft()
    message.value = creating ? '项目已新增并保存。' : '项目信息已保存。'
  } catch {
    error.value = '保存失败，内容尚未保存。请检查浏览器是否允许本地存储或存储空间是否已满。'
  }
}

function removeProject() {
  const project = selectedProject.value
  if (!project || !window.confirm(`确定删除项目“${project.name}”吗？删除后无法恢复，未保存的修改也会丢弃。`)) return
  clearFeedback()
  try {
    store.deleteProject(project.id)
    editorVisible.value = false
    selectedId.value = projects.value[0]?.id ?? null
    isCreating.value = false
    loadDraft()
    message.value = `项目“${project.name}”已删除。`
  } catch {
    error.value = '删除失败，项目已保留。请检查浏览器的本地存储权限或可用空间。'
  }
}

function previewProject() {
  // 离开确认交给 onBeforeRouteLeave，避免重复弹出。
  if (selectedProject.value) {
    router.push({ name: 'ProjectDetail', params: { id: selectedId.value } })
  }
}
</script>

<template>
  <header class="project-toolbar">
    <h3>项目信息管理 <span class="project-count">{{ projectCount }} 个项目</span></h3>
    <div class="toolbar-actions">
      <el-button v-if="selectedProject" @click="openEditor">编辑项目</el-button>
      <el-button type="primary" @click="startCreating">新增项目</el-button>
    </div>
  </header>
  <div v-if="projects.length" class="management-form project-picker">
    <div>
      <label for="project-select">选择项目</label>
      <select id="project-select" :value="isCreating ? '' : selectedId" @change="selectProject">
        <option v-if="isCreating" value="" disabled>正在新增项目</option>
        <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
      </select>
    </div>
  </div>
  <p v-if="message" class="form-success project-feedback" role="status" aria-live="polite">{{ message }}</p>
  <p v-if="error" class="form-error project-feedback" role="alert">{{ error }}</p>
  <el-dialog v-if="isCreating || selectedProject" v-model="editorVisible" :teleported="false"
    :title="isCreating ? '新增项目' : '编辑项目'" width="min(760px, calc(100vw - 32px))"
    :before-close="handleDialogClose">
  <form ref="form" class="management-form" novalidate
    @submit.prevent="submit" @input="clearFeedback">
    <h4 class="editor-heading">{{ isCreating ? '新增项目' : '编辑项目' }}<span v-if="isDirty" class="draft-status">未保存</span></h4>
    <div class="form-grid">
      <div>
        <label for="project-name">项目名称</label>
        <input id="project-name" v-model="draft.name" required maxlength="100" :aria-invalid="!!fieldErrors.name" :aria-describedby="fieldErrors.name ? 'name-error' : undefined" />
        <p v-if="fieldErrors.name" id="name-error" class="field-error">{{ fieldErrors.name }}</p>
      </div>
      <div>
        <label for="project-category">项目分类</label>
        <input id="project-category" v-model="draft.category" required maxlength="80" :aria-invalid="!!fieldErrors.category" :aria-describedby="fieldErrors.category ? 'category-error' : undefined" />
        <p v-if="fieldErrors.category" id="category-error" class="field-error">{{ fieldErrors.category }}</p>
      </div>
    </div>
    <div>
      <label for="project-summary">项目简介</label>
      <textarea id="project-summary" v-model="draft.summary" rows="3" required maxlength="500" :aria-invalid="!!fieldErrors.summary" :aria-describedby="fieldErrors.summary ? 'summary-error' : undefined"></textarea>
      <p v-if="fieldErrors.summary" id="summary-error" class="field-error">{{ fieldErrors.summary }}</p>
    </div>
    <div>
      <label for="project-cover">项目封面</label>
      <select id="project-cover" v-model="draft.cover">
        <option v-if="!covers.some(item => item.value === draft.cover)" :value="draft.cover">当前封面</option>
        <option v-for="cover in covers" :key="cover.value" :value="cover.value">{{ cover.label }}</option>
      </select>
    </div>
    <div>
      <label for="project-technologies">技术栈（逗号分隔）</label>
      <input id="project-technologies" v-model="draft.technologies" required maxlength="300" :aria-invalid="!!fieldErrors.technologies" :aria-describedby="fieldErrors.technologies ? 'technologies-error' : undefined" />
      <p v-if="fieldErrors.technologies" id="technologies-error" class="field-error">{{ fieldErrors.technologies }}</p>
    </div>
    <div>
      <label for="project-description">项目介绍</label>
      <textarea id="project-description" v-model="draft.description" rows="5" required maxlength="3000" :aria-invalid="!!fieldErrors.description" :aria-describedby="fieldErrors.description ? 'description-error' : undefined"></textarea>
      <p v-if="fieldErrors.description" id="description-error" class="field-error">{{ fieldErrors.description }}</p>
    </div>
    <div>
      <label for="project-features">主要功能（每行一项）</label>
      <textarea id="project-features" v-model="draft.features" rows="4" required maxlength="1500" :aria-invalid="!!fieldErrors.features" :aria-describedby="fieldErrors.features ? 'features-error' : undefined"></textarea>
      <p v-if="fieldErrors.features" id="features-error" class="field-error">{{ fieldErrors.features }}</p>
    </div>
    <div class="form-actions">
      <el-button native-type="submit" type="primary">{{ isCreating ? '保存新项目' : '保存项目' }}</el-button>
      <el-button type="info" plain @click="reset">{{ isCreating ? '取消新增' : '取消修改' }}</el-button>
      <el-button v-if="!isCreating" type="info" plain @click="previewProject">预览项目</el-button>
      <el-button v-if="!isCreating" type="danger" plain @click="removeProject">删除项目</el-button>
    </div>
  </form>
  </el-dialog>
  <p v-else>暂无项目。</p>
</template>

<style scoped>
.project-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 760px;
  margin-bottom: 20px;
}
.project-toolbar h3 { margin: 0; font-size: 20px; }
.toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.project-count,
.draft-status {
  display: inline-block;
  margin-left: 12px;
  color: #63716a;
  font-size: 14px;
  font-weight: 400;
}
.project-picker { margin-bottom: 20px; }
.project-feedback { margin-bottom: 16px; }
.editor-heading { margin: 0; font-size: 18px; }
.field-error {
  margin: 8px 0 0;
  color: #ab3030;
  font-size: 14px;
  overflow-wrap: anywhere;
}
[aria-invalid="true"] { border-color: #ab3030; }
.danger-action { color: #ab3030; background: #faeaea; }
.danger-action:hover { background: #f2d2d2; }
</style>
