<script lang="ts" setup>
import { SearchOutlined } from '@vicons/material';
import { DropdownOption, InputInst, NFlex, NTag } from 'naive-ui';

import { useWebSearchHistoryStore, useWenkuSearchHistoryStore } from '@/stores';
import { NovelListSearchOption } from './option';

const props = defineProps<{
  option: NovelListSearchOption;
  value: string;
}>();

const emit = defineEmits<{
  'update:value': [string];
  select: [string];
}>();

const searchHistoryStore =
  props.option.history === 'web'
    ? useWebSearchHistoryStore()
    : useWenkuSearchHistoryStore();
const { searchHistory } = storeToRefs(searchHistoryStore);

const options = computed(() => {
  const optionsBuffer: DropdownOption[] = [];

  searchHistory.value.queries?.forEach((it) =>
    optionsBuffer.push({
      key: it,
      label: it,
    }),
  );

  const tags = searchHistory.value.tags
    .sort((a, b) => Math.log2(b.used) - Math.log2(a.used))
    .map((it) => it.tag)
    .slice(0, 8);

  if (tags.length > 0) {
    if (optionsBuffer.length > 0) {
      optionsBuffer.push({
        key: 'footer-divider',
        type: 'divider',
      });
    }

    const renderCustomFooter = () =>
      h(
        NFlex,
        {
          size: [4, 4],
          align: 'center',
          style: ' width:100%; padding: 8px 12px;',
        },
        tags.map((tag) =>
          h(
            NTag,
            {
              type: tag.startsWith('-') ? 'error' : 'success',
              size: 'small',
              style: { cursor: 'pointer' },
              onClick() {
                emit(
                  'update:value',
                  props.value ? `${props.value} ${tag}` : tag,
                );
              },
            },
            { default: () => tag },
          ),
        ),
      );
    optionsBuffer.push({
      key: 'footer',
      type: 'render',
      render: renderCustomFooter,
    });
  }
  return optionsBuffer;
});

const inputRef = ref<InputInst>();
const showSuggestions = ref(false);
const toggleSuggestions = () => {
  // Hacky
  showSuggestions.value = !showSuggestions.value;
};

const handleSelect = (key: string) => {
  emit('select', key);
  searchHistoryStore.addHistory(key);
  inputRef.value?.blur();
  showSuggestions.value = false;
};
</script>

<template>
  <n-dropdown
    :disabled="options.length === 0"
    :show="showSuggestions"
    :options="options"
    :keyboard="false"
    :animated="false"
    width="trigger"
    @select="handleSelect"
    @clickoutside="toggleSuggestions"
  >
    <n-input
      ref="inputRef"
      v-bind="$attrs"
      clearable
      :value="value"
      :input-props="{ spellcheck: false }"
      @click="toggleSuggestions"
      @keyup.enter="handleSelect(value)"
      @update:value="(it: string) => emit('update:value', it)"
    >
      <template #suffix>
        <n-icon :component="SearchOutlined" />
      </template>
    </n-input>
  </n-dropdown>
</template>

<style>
.n-dropdown-option-body__label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
