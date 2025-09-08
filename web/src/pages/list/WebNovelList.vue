<script lang="ts" setup>
import { WebNovelRepo } from '@/hooks';
import router from '@/router';
import { FavoredRepo, useWhoamiStore } from '@/stores';
import { getWebNovelOptions, NovelListSelectOption } from './components/option';

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
}>();

const whoamiStore = useWhoamiStore();
const { whoami } = storeToRefs(whoamiStore);
const options = getWebNovelOptions(whoami.value.allowNsfw);

const favoredStore = FavoredRepo.useFavoredStore();
const { favoreds } = storeToRefs(favoredStore);

const { data: novelPage, error } = WebNovelRepo.useWebNovelList(
  () => props.page,
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
      return (options[n + 1] as NovelListSelectOption).tags
        .filter((_, index) => ((selected[n] ?? 0xff) & (1 << index)) !== 0)
        .map((tag) => providerMap[tag])
        .join();
    };
    return {
      query,
      provider: parseProviderBitFlags(0),
      type: selected[1] ?? 0,
      level: selected[2] ?? 0,
      translate: selected[3] ?? 0,
      sort: selected[4] ?? 0,
    };
  },
);

watch(novelPage, (novelPage) => {
  if (novelPage) {
    const favoredIds = favoreds.value.web.map((it) => it.id);
    for (const item of novelPage.items) {
      if (item.favored && !favoredIds.includes(item.favored)) {
        item.favored = undefined;
      }
    }
  }
});
</script>

<template>
  <div class="layout-content">
    <n-h1>网络小说</n-h1>

    <NovelListControls
      :query="query"
      :selected="selected"
      :options="options"
      @update:query="onUpdatedQuery"
      @update:selected="onUpdatedSelected"
    />

    <CPage
      :page="page"
      :page-number="novelPage?.pageNumber"
      @update:page="onUpdatePage"
    >
      <template v-if="novelPage">
        <n-divider />
        <NovelListWeb :items="novelPage.items" />
        <n-empty v-if="novelPage.items.length === 0" description="空列表" />
        <n-divider />
      </template>

      <CResultX v-else :error="error" title="加载错误" />
    </CPage>
  </div>
</template>
