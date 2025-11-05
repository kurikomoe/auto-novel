<script lang="ts" setup>
defineProps<{
  error: Error | null;
  title: string;
}>();
</script>

<template>
  <n-result
    v-if="error"
    status="error"
    :title="title"
    :description="error.message"
  />
  <n-spin
    v-else
    size="large"
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 36px 0;
    "
  />
</template>
