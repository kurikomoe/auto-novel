<script lang="ts" setup>
import type { WenkuNovelOutlineDto } from '@/model/WenkuNovel';

defineProps<{
  novels: WenkuNovelOutlineDto[] | undefined;
  error: Error | null;
}>();
</script>

<template>
  <template v-if="novels !== undefined">
    <n-grid :x-gap="12" :y-gap="12" cols="3 600:6">
      <n-grid-item v-for="item in novels" :key="item.id">
        <router-link :to="`/wenku/${item.id}`">
          <ImageCard
            :src="item.cover"
            :title="item.titleZh ? item.titleZh : item.title"
          />
        </router-link>
      </n-grid-item>
    </n-grid>
    <n-empty v-if="novels.length === 0" description="空列表" />
  </template>

  <CResultX v-else :error="error" title="加载错误" />
</template>
