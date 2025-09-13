<script setup lang="ts">
defineProps<{
  tags: string[];
}>();
const emits = defineEmits<{
  select: [string];
}>();
</script>

<template>
  <n-flex :size="[4, 4]" align="center" style="width: 100%; padding: 8px 12px">
    <n-tag
      v-for="tag in tags"
      :key="tag"
      :type="tag.startsWith('-') ? 'error' : 'success'"
      size="small"
      style="cursor: pointer"
      @click="emits('select', tag)"
    >
      {{ tag }}
    </n-tag>
  </n-flex>
</template>
