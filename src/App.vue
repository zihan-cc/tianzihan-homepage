<script setup>
import { computed, reactive, watchEffect } from "vue";
import { RouterView, useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import SiteHeader from "./components/SiteHeader.vue";
import SiteFooter from "./components/SiteFooter.vue";
import { useProfileStore } from "./stores/profile";
import { useUserStore } from "./stores/user";

const { profile, siteTitle } = storeToRefs(useProfileStore());
const { isAuthenticated } = storeToRefs(useUserStore());

const route = useRoute();

const siteInfo = reactive({
    get title() { return siteTitle.value; },
    subtitle: "记录学习经历，展示前端作品",
    logoText: "TZH",
});

const pageTitle = computed(() => {
    const title = route.meta.title;
    return typeof title === "function" ? title(route) : title || "个人主页";
});

// Track the resolved route and saved content so redirects and edits get the correct title.
watchEffect(() => {
    if (route.matched.length) {
        document.title = `${pageTitle.value} | ${siteInfo.title}`;
    }
});
const navItems = [
    { name: "Home", label: "首页" },
    { name: "Profile", label: "基本信息" },
    { name: "Skills", label: "技能搜索" },
    { name: "Projects", label: "项目中心" },
    { name: "Articles", label: "学习文章" },
    { name: "Interests", label: "兴趣爱好" },
    { name: "Contact", label: "联系信息" },
];

function backToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}
</script>

<template>
    <el-container class="page-shell" direction="vertical">
        <SiteHeader :site-info="siteInfo" :nav-items="navItems" :is-authenticated="isAuthenticated" />
        <el-main class="page-main">
            <section v-if="!route.meta.requiresAuth && route.name !== 'Login'" class="hero">
                <h1>{{ profile.name }}的个人主页</h1>
                <p>{{ profile.majorClass }} · {{ pageTitle }}</p>
            </section>
            <div class="page-content">
                <RouterView />
            </div>
        </el-main>
        <SiteFooter @back-to-top="backToTop" />
    </el-container>
</template>

<style scoped>
.page-shell {
    min-height: 100vh;
}

.page-main {
    padding: 0;
    min-height: 0;
}

.hero {
    padding: 42px 20px;
    text-align: center;
    color: #344022;
    background: linear-gradient(135deg, #e0cde2, #d9d88a);
}

.hero h1 {
    margin: 0 0 10px;
    font-size: 30px;
    overflow-wrap: anywhere;
}

.hero p {
    margin: 0;
    opacity: 0.9;
    overflow-wrap: anywhere;
}

.page-content {
    flex: 1;
    width: min(960px, 92%);
    margin: 24px auto;
}

@media (max-width: 720px) {
    .hero h1 {
        font-size: 24px;
    }
}
</style>
