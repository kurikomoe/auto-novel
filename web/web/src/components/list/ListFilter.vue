<script lang="ts" setup generic="ListOptionSpec extends ListOptions">
import type { ListOptions, ListValue } from './types';

const props = defineProps<{
  value: ListValue<ListOptionSpec>;
  options: ListOptionSpec;
}>();

const emits = defineEmits<{
  'update:value': [ListValue<ListOptionSpec>];
}>();

function changeOptionValue(label: string, val: string | number) {
  const newValue = { ...props.value, [label]: val };
  emits('update:value', newValue);
}
</script>

<template>
  <n-flex
    v-if="Object.keys(options).length > 0"
    size="large"
    vertical
    style="width: 100%; margin-top: 8px"
  >
    <template v-for="(option, label) in options" :key="label">
      <template v-if="!option.hide">
        <ListFilterText
          v-if="option.type === 'text'"
          :label="String(label)"
          :option="option"
          :value="String(value[label])"
          @update:value="changeOptionValue(String(label), $event)"
        />
        <ListFilterSelect
          v-else-if="option.type === 'select'"
          :label="String(label)"
          :option="option"
          :value="Number(value[label] ?? 0)"
          @update:value="changeOptionValue(String(label), $event)"
        />
      </template>
    </template>
  </n-flex>
</template>
