import { defineStore } from 'pinia'
import { defaultInterests, defaultProfile, defaultSkills } from '../data/homepage'
import { loadStoredData, storeData } from '../data/storage'

const profileKey = 'homepage-profile'
const keywordKey = 'homepage-skill-keyword'
const isProfile = value => value && typeof value === 'object' &&
  Object.keys(defaultProfile).every(key => typeof value[key] === 'string')

export const useProfileStore = defineStore('profile', {
  state: () => ({
    profile: { ...loadStoredData(profileKey, defaultProfile, isProfile) },
    skills: defaultSkills.map(skill => ({ ...skill })),
    interests: [...defaultInterests],
    // 首页与独立技能页共用搜索状态，刷新后也恢复关键词。
    keyword: loadStoredData(keywordKey, '', value => typeof value === 'string'),
  }),
  getters: {
    siteTitle: state => `${state.profile.name}的个人主页`,
    skillCount: state => state.skills.length,
    filteredSkills: state => {
      const text = state.keyword.trim().toLowerCase()
      return state.skills.filter(skill => skill.name.toLowerCase().includes(text))
    },
  },
  actions: {
    saveProfile(value) {
      if (!isProfile(value)) throw new Error('Invalid profile')
      const next = Object.fromEntries(Object.keys(defaultProfile).map(key => [key, value[key].trim()]))
      if (['name', 'majorClass', 'direction', 'introduction', 'goal', 'email'].some(key => !next[key])) {
        throw new Error('Invalid profile')
      }
      storeData(profileKey, next)
      Object.assign(this.profile, next)
    },
    setKeyword(value) {
      const next = value.trim()
      storeData(keywordKey, next)
      this.keyword = next
    },
  },
})
