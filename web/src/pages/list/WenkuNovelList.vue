<script lang="ts" setup>
import { PlusOutlined } from '@vicons/material';

import { useWenkuNovelList } from '@/hooks';
import router from '@/router';
import { useFavoredStore, useWhoamiStore } from '@/stores';
import { getWenkuNovelOptions } from './components/option';

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

const options = getWenkuNovelOptions(whoami.value.allowNsfw);

const favoredStore = useFavoredStore();
const { favoreds } = storeToRefs(favoredStore);
onMounted(() => favoredStore.loadRemoteFavoreds());

const { data: novelPage, error } = useWenkuNovelList(
  () => props.page,
  () => {
    let level = (props.selected[0] ?? 0) + 1;
    if (!whoami.value.allowNsfw && level === 2) {
      level = 3;
    }
    return { query: props.query, level };
  },
);

watch(novelPage, (novelPage) => {
  if (novelPage) {
    const favoredIds = favoreds.value.wenku.map((it) => it.id);
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
    <n-h1>文库小说</n-h1>

    <router-link to="/wenku-edit">
      <c-button
        label="新建小说"
        :icon="PlusOutlined"
        style="margin-bottom: 8px"
      />
    </router-link>

    <NovelListControls
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
        <NovelListWenku :items="novelPage.items" />
        <n-empty v-if="novelPage.items.length === 0" description="空列表" />
        <n-divider />
      </template>

      <CResultX v-else :error="error" title="加载错误" />
    </CPage>
  </div>
</template>

<style scoped>
.n-card-header__main {
  text-overflow: ellipsis;
}
</style>
