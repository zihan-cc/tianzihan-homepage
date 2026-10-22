<script setup>
import { reactive } from "vue";
const footerInfo = reactive({
    copyright: "个人学习主页",
    course: "Web前端框架程序设计",
    statement: "本页面仅用于课程学习与作品展示",
});
const currentYear = new Date().getFullYear();
const emit = defineEmits(["backToTop"]);
</script>
<template>
    <el-footer class="site-footer" height="auto">
        <div class="footer-inner">
            <div>
                <p>© {{ currentYear }} {{ footerInfo.copyright }}</p>
                <p>{{ footerInfo.course }} · {{ footerInfo.statement }}</p>
            </div>
            <button class="back-top" @click="emit('backToTop')">返回顶部</button>
        </div>
    </el-footer>
</template>
<style scoped>
.site-footer {
    margin-top: 36px;
    padding: 24px 0;
    height: auto;
    color: #d8e4e0;
    background: #959f61;
}

.footer-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    width: min(1100px, 92%);
    margin: 0 auto;
}

.site-footer p {
    margin: 4px 0;
}

.back-top {
    flex: 0 0 auto;
    color: #959f61;
    background: #fff;
}

@media (max-width: 760px) {
    .footer-inner {
        align-items: flex-start;
        flex-direction: column;
    }
}
</style>
