import { defineStore } from 'pinia'
import { defaultProjects, isProjectList, validateProject } from '../data/projects'
import { loadStoredData, storeData } from '../data/storage'

export { validateProject } from '../data/projects'

const projectsKey = 'homepage-projects'
const lastIdKey = 'homepage-project-last-id'
const cloneProject = value => ({ ...value, technologies: [...value.technologies], features: [...value.features] })

function normalizeProject(value) {
  const next = { ...value }
  for (const key of ['name', 'category', 'summary', 'description', 'cover']) {
    if (typeof next[key] === 'string') next[key] = next[key].trim()
  }
  for (const key of ['technologies', 'features']) {
    if (Array.isArray(next[key])) next[key] = next[key].map(text => typeof text === 'string' ? text.trim() : text)
  }
  if (Object.keys(validateProject(next)).length) throw new Error('Invalid project')
  return cloneProject(next)
}

export const useProjectStore = defineStore('projects', {
  state: () => {
    const projects = loadStoredData(projectsKey, defaultProjects, isProjectList).map(cloneProject)
    const savedId = loadStoredData(lastIdKey, 0, value => Number.isSafeInteger(value) && value >= 0)
    return { projects, lastId: projects.reduce((max, item) => Math.max(max, item.id), savedId) }
  },
  getters: {
    projectCount: state => state.projects.length,
    categories: state => [...new Set(state.projects.map(item => item.category))],
    findProjectById: state => value => {
      const id = Number(value)
      return Number.isSafeInteger(id) && id > 0 ? state.projects.find(item => item.id === id) : undefined
    },
  },
  actions: {
    addProject(value) {
      const normalized = normalizeProject(value)
      // 兼容原有存储键，并保留已删除项目的编号，避免旧链接指向新项目。
      const savedId = loadStoredData(lastIdKey, 0, value => Number.isSafeInteger(value) && value >= 0)
      const id = Math.max(this.lastId, savedId) + 1
      if (!Number.isSafeInteger(id)) throw new Error('Project ID limit reached')
      const project = { ...normalized, id }
      const next = [...this.projects, project]
      storeData(lastIdKey, id)
      storeData(projectsKey, next)
      this.projects = next
      this.lastId = id
      return project
    },
    saveProject(value) {
      const existing = this.findProjectById(value.id)
      if (!existing) throw new Error('Project not found')
      // 路由编号可能为字符串，使用查到的数值编号进行替换。
      const project = { ...normalizeProject(value), id: existing.id }
      const next = this.projects.map(item => item.id === project.id ? project : item)
      storeData(projectsKey, next)
      this.projects = next
      return project
    },
    deleteProject(id) {
      const project = this.findProjectById(id)
      if (!project) throw new Error('Project not found')
      const next = this.projects.filter(item => item.id !== project.id)
      storeData(lastIdKey, this.lastId)
      storeData(projectsKey, next)
      this.projects = next
    },
  },
})
