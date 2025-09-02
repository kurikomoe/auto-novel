<script lang="ts" setup generic="T extends any">
import { onKeyDown } from '@/pages/util';

const props = defineProps<{
  page: number;
  pageNumber?: number;
  disableTop?: boolean;
}>();

const emits = defineEmits<{
  (e: 'update:page', page: number): void;
}>();

const realPageNumber = ref(1);
watch(
  () => props.pageNumber,
  (pageNumber) => {
    if (pageNumber && pageNumber > 0) {
      realPageNumber.value = pageNumber;
    }
  },
  { immediate: true },
);

onKeyDown('ArrowLeft', (e) => {
  const page = props.page;
  if (page > 1) {
    // hacky:防止在编辑搜索栏时跳转
    if (e.target instanceof Element && e.target.tagName === 'INPUT') {
      return;
    }
    emits('update:page', page - 1);
    e.preventDefault();
  }
});

onKeyDown('ArrowRight', (e) => {
  const page = props.page;
  if (page < realPageNumber.value) {
    // hacky:防止在编辑搜索栏时跳转
    if (e.target instanceof Element && e.target.tagName === 'INPUT') {
      return;
    }
    emits('update:page', page + 1);
    e.preventDefault();
  }
});
</script>

<template>
  <n-pagination
    v-if="!disableTop && realPageNumber > 1"
    :page="page"
    @update-page="(page) => emits('update:page', page)"
    :page-count="realPageNumber"
    :page-slot="7"
    style="margin-top: 20px"
  />
  <slot />
  <n-pagination
    v-if="realPageNumber > 1"
    :page="page"
    @update-page="(page) => emits('update:page', page)"
    :page-count="realPageNumber"
    :page-slot="7"
  />
</template>
