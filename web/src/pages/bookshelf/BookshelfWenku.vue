<script lang="ts" setup>
import { ChecklistOutlined } from '@vicons/material';

import { useWenkuNovelFavoredList } from '@/hooks';
import { useIsWideScreen } from '@/pages/util';
import router from '@/router';
import { useSettingStore } from '@/stores';
import NovelListWenku from '../list/components/NovelListWenku.vue';

const route = useRoute();

const onUpdatePage = (page: number) => {
  const query = { ...route.query, page };
  router.push({ path: route.path, query });
};
const onUpdatedSelected = (selected: number[]) => {
  const query = { ...route.query, selected, page: 1 };
  router.push({ path: route.path, query });
};

const props = defineProps<{
  page: number;
  selected: number[];
  favoredId: string;
}>();

const isWideScreen = useIsWideScreen();

const settingStore = useSettingStore();
const { setting } = storeToRefs(settingStore);

const options = computed(() => {
  return [
    {
      label: '排序',
      tags: setting.value.favoriteCreateTimeFirst
        ? ['收藏时间', '更新时间']
        : ['更新时间', '收藏时间'],
    },
  ];
});

const { data: novelPage, error } = useWenkuNovelFavoredList(
  () => props.page,
  () => props.favoredId,
  () => {
    const selected = props.selected;

    const optionNth = (n: number): string => options.value[n].tags[selected[n]];
    const optionSort = () => {
      const option = optionNth(0);
      if (option === '更新时间') {
        return 'update';
      } else {
        return 'create';
      }
    };
    return {
      sort: optionSort(),
    };
  },
);

const showControlPanel = ref(false);

const novelListRef = ref<InstanceType<typeof NovelListWenku>>();
</script>

<template>
  <bookshelf-layout :menu-key="`wenku/${favoredId}`">
    <n-flex style="margin-bottom: 24px">
      <c-button
        label="选择"
        :icon="ChecklistOutlined"
        @action="showControlPanel = !showControlPanel"
      />
      <bookshelf-list-button
        v-if="!isWideScreen"
        :menu-key="`wenku/${favoredId}`"
      />
    </n-flex>

    <n-collapse-transition :show="showControlPanel" style="margin-bottom: 16px">
      <bookshelf-wenku-control
        :selected-novels="novelListRef!.selectedNovels"
        :favored-id="favoredId"
        @select-all="novelListRef!.selectAll()"
        @invert-selection="novelListRef!.invertSelection()"
      />
    </n-collapse-transition>

    <NovelListControls
      :selected="selected"
      :options="options"
      @update:selected="onUpdatedSelected"
    />

    <CPageX
      :page="page"
      :page-number="novelPage?.pageNumber"
      @update:page="onUpdatePage"
    >
      <template v-if="novelPage">
        <n-divider />
        <NovelListWenku
          ref="novelListRef"
          :items="novelPage.items"
          :selectable="showControlPanel"
          simple
        />
        <n-empty v-if="novelPage.items.length === 0" description="空列表" />
        <n-divider />
      </template>

      <CResultX v-else :error="error" title="加载错误" />
    </CPageX>
  </bookshelf-layout>
</template>
