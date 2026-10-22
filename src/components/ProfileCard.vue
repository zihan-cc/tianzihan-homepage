<script setup>
import { ref } from "vue";
const props = defineProps({ profile: { type: Object, required: true } });
const showDetails = ref(false);
function toggleDetails() {
    showDetails.value = !showDetails.value;
}
</script>
<template>
    <section id="profile" class="card profile-card">
        <h2>基本信息</h2>
        <img class="avatar" :src="props.profile.avatar" :alt="props.profile.name + '的头像'" width="120" height="120" />
        <p><strong>姓名：</strong>{{ props.profile.name }}</p>
        <p><strong>专业班级：</strong>{{ props.profile.majorClass }}</p>
        <p><strong>学习方向：</strong>{{ props.profile.direction }}</p>
        <div class="button-row">
            <button @click="toggleDetails">
                {{ showDetails ? "收起详情" : "展开详情" }}
            </button>
        </div>
        <div v-if="showDetails" class="details">
            <p><strong>个人简介：</strong>{{ props.profile.introduction }}</p>
            <p><strong>学习目标：</strong>{{ props.profile.goal }}</p>
        </div>
    </section>
</template>
<style scoped>
.profile-card {
    grid-row: span 2;
}

.avatar {
    display: block;
    margin: 0 auto 18px;
    border: 5px solid #e8f6f0;
    border-radius: 50%;
}

.button-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.secondary {
    color: #35495e;
    background: #e8f6f0;
}

.details {
    margin-top: 16px;
    padding: 12px;
    background: #f4faf7;
    border-left: 4px solid #f0e352;
    border-radius: 4px;
}

@media (max-width: 720px) {
    .profile-card {
        grid-row: auto;
    }
}
</style>
