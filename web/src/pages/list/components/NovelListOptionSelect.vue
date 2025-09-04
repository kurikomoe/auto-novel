<script setup lang="ts">
import { SyncAltOutlined } from '@vicons/material';

import { NovelListOption } from './option';

const props = defineProps<{
  option: NovelListOption;
  selected: number;
}>();

const emits = defineEmits<{
  (e: 'update:selected', selected: number): void;
}>();

function isSelected(index: number) {
  if (props.option.multiple) {
    return (props.selected & (1 << index)) != 0;
  } else {
    return props.selected === index;
  }
}

const updateSelect = (optionIndex: number) => {
  const index = props.option.multiple
    ? props.selected ^ (1 << optionIndex)
    : optionIndex;
  emits('update:selected', index);
};

function invertSelection() {
  if (props.option.multiple) {
    const index = props.selected ^ (2 ** props.option.tags.length - 1);
    emits('update:selected', index);
  }
}
</script>

<template>
  <c-action-wrapper :title="option.label" align="baseline" size="large">
    <n-flex :size="[16, 4]">
      <n-text
        v-for="(tag, index) in option.tags"
        :key="tag"
        text
        :type="isSelected(index) ? 'primary' : 'default'"
        @click="updateSelect(index)"
        style="cursor: pointer"
      >
        {{ tag }}
      </n-text>

      <c-button
        v-if="option.multiple"
        :icon="SyncAltOutlined"
        type="primary"
        text
        @click="invertSelection()"
      />
    </n-flex>
  </c-action-wrapper>
</template>
