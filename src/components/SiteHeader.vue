<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ElMenu, ElMenuItem } from 'element-plus'
const props = defineProps({
    siteInfo: { type: Object, required: true },
    navItems: { type: Array, required: true },
    isAuthenticated: { type: Boolean, default: false },
});
const route = useRoute()
const router = useRouter()
const activeNav = computed(() => route.name || 'Home')
function selectNav(name) {
    router.push({ name })
}
</script>
<template>
    <el-header class="site-header" height="auto">
        <div class="header-inner">
            <RouterLink class="brand" :to="{ name: 'Home' }">
                <span class="brand-logo">{{ props.siteInfo.logoText }}</span>
                <span>
                    <strong>{{ props.siteInfo.title }}</strong>
                    <small>{{ props.siteInfo.subtitle }}</small>
                </span>
            </RouterLink>
            <nav class="site-nav" aria-label="个人主页导航">
                <el-menu :default-active="activeNav" mode="horizontal" :ellipsis="false"
                    @select="selectNav">
                    <el-menu-item v-for="item in props.navItems" :key="item.name" :index="item.name">
                        {{ item.label }}
                    </el-menu-item>
                </el-menu>
            </nav>
            <nav class="management-entry" aria-label="内容管理入口">
                <RouterLink :to="{ name: props.isAuthenticated ? 'Admin' : 'Login' }">
                    {{ props.isAuthenticated ? '后台管理' : '管理员登录' }}
                </RouterLink>
            </nav>
        </div>
    </el-header>
</template>
<style scoped>
.site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    height: auto;
    padding: 0;
    color: #fff;
    background: #959f61;
    box-shadow: 0 2px 10px rgba(38, 50, 56, 0.18);
}

.header-inner {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 20px;
    width: min(1100px, 92%);
    min-height: 72px;
    margin: 0 auto;
}

.brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    text-decoration: none;
    min-width: 0;
    overflow-wrap: anywhere;
}

.brand-logo {
    flex-shrink: 0;
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    color: #959f61;
    background: #fff;
    border-radius: 50%;
    font-weight: 700;
}

.brand strong,
.brand small {
    display: block;
}

.brand small {
    margin-top: 3px;
    opacity: 0.75;
}

.site-nav {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.site-nav :deep(.el-menu) {
    --el-menu-bg-color: transparent;
    --el-menu-text-color: #fff;
    --el-menu-hover-text-color: #344022;
    --el-menu-active-color: #344022;
    border-bottom: 0;
}

.site-nav :deep(.el-menu-item) {
    height: 40px;
    line-height: 40px;
    margin: 0 2px;
    border-bottom: 0;
    border-radius: 6px;
}

.site-nav :deep(.el-menu-item.is-active) {
    background: #fff;
}

.site-nav a {
    padding: 8px 11px;
    color: #fff;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    text-decoration: none;
    white-space: nowrap;
}

.site-nav a:hover,
.site-nav a.router-link-active {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.35);
}

.site-nav a.router-link-exact-active {
    color: #344022;
    background: #fff;
    border-color: #fff;
}

.management-entry {
    display: flex;
    justify-content: flex-end;
    padding-left: 20px;
    border-left: 1px solid rgba(255, 255, 255, 0.4);
}

.management-entry a {
    padding: 8px 11px;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 6px;
    text-decoration: none;
    white-space: nowrap;
}

.management-entry a:hover,
.management-entry a.router-link-active {
    color: #344022;
    background: #fff;
    border-color: #fff;
}

@media (max-width: 1200px) {
    .header-inner {
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        padding: 14px 0;
    }

    .brand {
        grid-column: 1 / -1;
    }
}

@media (max-width: 600px) {
    .header-inner {
        grid-template-columns: minmax(0, 1fr);
    }

    .site-nav {
        width: 100%;
    }

    .management-entry {
        padding: 10px 0 0;
        border-left: 0;
        border-top: 1px solid rgba(255, 255, 255, 0.4);
    }
}
</style>
