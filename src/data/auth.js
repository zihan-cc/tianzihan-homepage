import { loadStoredData, storeData } from './storage'

const userKey = 'homepage-user'

// 只保存课堂演示用户的身份，不保存密码；无效数据按未登录处理。
export function readStoredUser() {
  const user = loadStoredData(userKey, null, value => value && value.username === 'admin')
  return user ? { username: user.username } : null
}

export function saveStoredUser(user) {
  storeData(userKey, { username: user.username })
}

export function clearStoredUser() {
  localStorage.removeItem(userKey)
}
