<script lang="ts" setup generic="T extends any">
import { useSettingStore } from '@/stores';
import { RegexUtil } from '@/util';
import { NovelListOption, NovelListSelectOption } from './option';

const props = defineProps<{
  query?: string;
  selected?: number[];
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
    const newSelected = options
      .filter((option) => 'history' in option)
      .map((option, index) => {
        const { tags, multiple } = option as any as NovelListSelectOption;
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
    v-if="options.length >= 0"
    size="large"
    vertical
    style="width: 100%; margin-top: 8px"
  >
    <template v-for="(option, optionIndex) in options" :key="option.label">
      <c-action-wrapper
        v-if="'history' in option"
        :title="option.label"
        size="large"
      >
        <NovelListControlSearch
          :option="option"
          v-model:value="queryEdit"
          :placeholder="`中/日文标题或作者`"
          style="flex: 0 1 400px; margin-right: 8px"
          @select="onUpdateQuery"
        />
      </c-action-wrapper>

      <NovelListControlSelect
        v-else
        :option="option"
        :selected="selectedWithDefault[optionIndex]"
        @update:selected="
          (index) => {
            selectedWithDefault[optionIndex] = index;
            emits('update:selected', selectedWithDefault);
          }
        "
      />
    </template>
  </n-flex>
</template>
