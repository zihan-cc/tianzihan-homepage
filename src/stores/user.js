import { defineStore } from 'pinia'
import { clearStoredUser, readStoredUser, saveStoredUser } from '../data/auth'

export const useUserStore = defineStore('user', {
  state: () => ({
    currentUser: readStoredUser(),
  }),
  getters: {
    isAuthenticated: state => state.currentUser !== null,
    username: state => state.currentUser?.username || '',
  },
  actions: {
    // 先持久化再更新共享状态，刷新或重新打开网站后恢复登录。
    login(username, password) {
      if (username !== 'admin' || password !== '123456') return false
      const user = { username }
      saveStoredUser(user)
      this.currentUser = user
      return true
    },
    logout() {
      clearStoredUser()
      this.currentUser = null
    },
  },
})
