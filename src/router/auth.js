// 登录页提交与已登录访问登录页时，使用同一套站内回跳规则。
export function getLoginDestination(router, target) {
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    const resolved = router.resolve(target)
    if (resolved.matched.some(record => record.meta.requiresAuth)) return resolved.fullPath
  }
  return { name: 'AdminProfile' }
}
