<script lang="ts" setup>
import { ChecklistOutlined } from '@vicons/material';

import { useWebNovelFavoredList } from '@/hooks';
import { useIsWideScreen } from '@/pages/util';
import router from '@/router';
import { useSettingStore } from '@/stores';
import NovelListWeb from '../list/components/NovelListWeb.vue';
import { NovelListSelectOption } from '../list/components/option';

const route = useRoute();

const onUpdatePage = (page: number) => {
  const query = { ...route.query, page };
  router.push({ path: route.path, query });
};
const onUpdatedQuery = (query: string) => {
  const q = { ...route.query, query, page: 1 };
  router.push({ path: route.path, query: q });
};
const onUpdatedSelected = (selected: number[]) => {
  const query = { ...route.query, selected, page: 1 };
  router.push({ path: route.path, query });
};

const props = defineProps<{
  page: number;
  query: string;
  selected: number[];
  favoredId: string;
}>();

const isWideScreen = useIsWideScreen();

const settingStore = useSettingStore();
const { setting } = storeToRefs(settingStore);

const options = computed(
  () =>
    <NovelListSelectOption[]>[
      {
        label: '搜索',
        history: 'web',
      },
      {
        label: '来源',
        tags: [
          'Kakuyomu',
          '成为小说家吧',
          'Novelup',
          'Hameln',
          'Pixiv',
          'Alphapolis',
        ],
        multiple: true,
      },
      {
        label: '类型',
        tags: ['全部', '连载中', '已完结', '短篇'],
      },
      {
        label: '分级',
        tags: ['全部', '一般向', 'R18'],
      },
      {
        label: '翻译',
        tags: ['全部', 'GPT', 'Sakura'],
      },
      {
        label: '排序',
        tags: setting.value.favoriteCreateTimeFirst
          ? ['收藏时间', '更新时间']
          : ['更新时间', '收藏时间'],
      },
    ],
);

const { data: novelPage, error } = useWebNovelFavoredList(
  () => props.page,
  () => props.favoredId,
  () => {
    const query = props.query;
    const selected = props.selected;

    const parseProviderBitFlags = (n: number): string => {
      const providerMap: { [key: string]: string } = {
        Kakuyomu: 'kakuyomu',
        成为小说家吧: 'syosetu',
        Novelup: 'novelup',
        Hameln: 'hameln',
        Pixiv: 'pixiv',
        Alphapolis: 'alphapolis',
      };
      return (options.value[n] as NovelListSelectOption).tags
        .filter((_, index) => (selected[n] & (1 << index)) !== 0)
        .map((tag) => providerMap[tag])
        .join();
    };

    const parseSort = (sortIndex: number): 'create' | 'update' => {
      const sortOption = (options.value.find((opt) => opt.label === '排序')
        ?.tags ?? [])[sortIndex];
      switch (sortOption) {
        case '收藏时间':
          return 'create';
        case '更新时间':
        default:
          return 'update';
      }
    };
    return {
      query,
      provider: parseProviderBitFlags(0),
      type: selected[1],
      level: selected[2],
      translate: selected[3],
      sort: parseSort(selected[4]),
    };
  },
);

const showControlPanel = ref(false);

const novelListRef = ref<InstanceType<typeof NovelListWeb>>();
</script>

<template>
  <bookshelf-layout :menu-key="`web/${favoredId}`">
    <n-flex style="margin-bottom: 24px">
      <c-button
        label="选择"
        :icon="ChecklistOutlined"
        @action="showControlPanel = !showControlPanel"
      />
      <bookshelf-list-button
        v-if="!isWideScreen"
        :menu-key="`web/${favoredId}`"
      />
    </n-flex>

    <n-collapse-transition :show="showControlPanel" style="margin-bottom: 16px">
      <bookshelf-web-control
        :selected-novels="novelListRef!.selectedNovels"
        :favored-id="favoredId"
        @select-all="novelListRef!.selectAll()"
        @invert-selection="novelListRef!.invertSelection()"
      />
    </n-collapse-transition>

    <NovelListControls
      :query="query"
      :selected="selected"
      :options="options"
      @update:query="onUpdatedQuery"
      @update:selected="onUpdatedSelected"
    />

    <CPageX
      :page="page"
      :page-number="novelPage?.pageNumber"
      @update:page="onUpdatePage"
    >
      <template v-if="novelPage">
        <n-divider />
        <NovelListWeb
          ref="novelListRef"
          :items="novelPage.items"
          :selectable="showControlPanel"
          :simple="!setting.showTagInWebFavored"
        />
        <n-empty v-if="novelPage.items.length === 0" description="空列表" />
        <n-divider />
      </template>

      <CResultX v-else :error="error" title="加载错误" />
    </CPageX>
  </bookshelf-layout>
</template>
