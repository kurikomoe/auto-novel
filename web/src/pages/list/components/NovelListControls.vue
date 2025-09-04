<script lang="ts" setup generic="T extends any">
import { useSettingStore } from '@/stores';
import { RegexUtil } from '@/util';
import { NovelListOption } from './option';

const props = defineProps<{
  query?: string;
  selected?: number[];
  search?: { suggestions: string[]; tags: string[] };
  options: NovelListOption[];
}>();

const emits = defineEmits<{
  (e: 'update:query', query: string): void;
  (e: 'update:selected', selected: number[]): void;
}>();

const processQueryWithLocaleAware = (input: string): string => {
  const cc = useSettingStore().cc;
  const queries = input.split(/( |\||\+|\-|\")/);
  const result: string[] = [];
  for (const query of queries) {
    if (
      !query.includes('$') &&
      !RegexUtil.hasKanaChars(query) &&
      !RegexUtil.hasHangulChars(query) &&
      RegexUtil.hasHanzi(query)
    ) {
      const queryData = cc.toData(query);
      if (queryData === query) {
        result.push(query);
      } else {
        result.push(`(${[query, queryData].join('|')})`);
      }
    } else {
      result.push(query);
    }
  }
  return result.join('');
};

const queryEdit = ref();
watch(
  () => props.query,
  (query) => (queryEdit.value = query ?? ''),
  { immediate: true },
);
const onUpdateQuery = (query: string) => {
  query = query.trim();
  if (useSettingStore().setting.searchLocaleAware) {
    query = processQueryWithLocaleAware(query);
  }
  emits('update:query', query);
};

const selectedWithDefault = ref<number[]>([]);

watch(
  props,
  ({ options, selected }) => {
    const newSelected = options.map(({ tags, multiple }, index) => {
      const defaultSelected = multiple ? 2 ** tags.length - 1 : 0;
      return selected?.[index] ?? defaultSelected;
    });
    const isEqual = (a: number[], b: number[]) => {
      if (a.length !== b.length) return false;
      for (const [i, av] of a.entries()) {
        const bv = b[i];
        if (av !== bv) return false;
      }
      return true;
    };
    if (!isEqual(newSelected, selectedWithDefault.value)) {
      selectedWithDefault.value = newSelected;
    }
  },
  { immediate: true },
);
</script>

<template>
  <n-flex
    v-if="search !== undefined || options.length >= 0"
    size="large"
    vertical
    style="width: 100%; margin-top: 8px"
  >
    <c-action-wrapper v-if="search !== undefined" title="搜索" size="large">
      <input-with-suggestion
        v-model:value="queryEdit"
        :suggestions="search.suggestions"
        :tags="search.tags"
        :placeholder="`中/日文标题或作者`"
        style="flex: 0 1 400px; margin-right: 8px"
        :input-props="{ sselectedWithDefaultpellcheck: false }"
        @select="onUpdateQuery"
      />
    </c-action-wrapper>

    <NovelListOptionSelect
      v-for="(option, optionIndex) in options"
      :key="option.label"
      :option="option"
      :selected="selectedWithDefault[optionIndex]"
      @update:selected="
        (index) => {
          selectedWithDefault[optionIndex] = index;
          emits('update:selected', selectedWithDefault);
        }
      "
    />
  </n-flex>
</template>
