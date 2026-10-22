// 默认数据与校验规则；响应式状态和数据操作由项目 Store 管理。
export const defaultProjects = [
  {
    id: 1,
    name: '个人主页',
    category: '组件化练习',
    summary: '使用 Vue 3 组件展示个人资料、学习方向、兴趣爱好与联系方式。',
    technologies: ['Vue 3', 'JavaScript', 'CSS'],
    description: '以实验二的个人主页为基础，将页头、个人资料、技能搜索和页脚拆分为独立组件，通过 props 和自定义事件完成组件通信。实验三进一步使用 Vue Router 将主要栏目拆分为独立页面。',
    features: ['个人资料展示与详情展开', '组件间数据传递与事件通信', '响应式布局与顶部路由导航'],
    cover: 'images/profile-project.png',
  },
  {
    id: 2,
    name: '技能搜索',
    category: '响应式交互练习',
    summary: '通过关键词实时筛选技能，展示匹配数量和熟悉程度。',
    technologies: ['Vue 3', 'computed', 'v-model'],
    description: '将现有个人主页中的技能搜索模块作为独立学习作品展示。输入关键词后，通过计算属性实时筛选技能列表，使用 v-model 完成父子组件双向绑定，并在没有匹配结果时显示空状态。',
    features: ['不区分大小写的关键词搜索', '实时展示匹配数量与技能熟悉程度', '无匹配结果提示与搜索状态保留'],
    cover: 'images/skills-project.png',
  },
]

export function isProjectList(value) {
  return Array.isArray(value) && new Set(value.map((item) => item?.id)).size === value.length &&
    value.every((item) => item && Number.isSafeInteger(item.id) && item.id > 0 &&
      ['name', 'category', 'summary', 'description', 'cover'].every((key) => typeof item[key] === 'string') &&
      ['technologies', 'features'].every((key) => Array.isArray(item[key]) && item[key].every((text) => typeof text === 'string')))
}

export function validateProject(value) {
  const errors = {}
  for (const [key, label, limit] of [
    ['name', '项目名称', 100], ['category', '项目分类', 80],
    ['summary', '项目简介', 500], ['description', '项目介绍', 3000],
  ]) {
    if (typeof value[key] !== 'string' || !value[key].trim()) errors[key] = `请填写${label}，不能只输入空格。`
    else if (value[key].length > limit) errors[key] = `${label}不能超过 ${limit} 字。`
  }
  for (const [key, label, limit, separator] of [
    ['technologies', '技术栈', 300, ', '], ['features', '主要功能', 1500, '\n'],
  ]) {
    if (!Array.isArray(value[key]) || !value[key].length || value[key].some(text => typeof text !== 'string' || !text.trim())) {
      errors[key] = `请至少填写一项${label}，不能只输入空格或分隔符。`
    } else if (value[key].join(separator).length > limit) {
      errors[key] = `${label}不能超过 ${limit} 字。`
    }
  }
  if (typeof value.cover !== 'string') errors.cover = '请选择有效的项目封面。'
  return errors
}

