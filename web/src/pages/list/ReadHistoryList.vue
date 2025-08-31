<script lang="ts" setup>
import { DeleteOutlineOutlined } from '@vicons/material';

import { WebNovelOutlineDto } from '@/model/WebNovel';
import { useReadHistoryStore } from '@/stores';
import { runCatching } from '@/util/result';

import { Loader } from '../list/components/NovelPage.vue';
import { doAction } from '../util';

defineProps<{
  page: number;
}>();

const message = useMessage();

const readHistoryStore = useReadHistoryStore();
const { readHistoryPaused } = readHistoryStore;

onMounted(() => {
  readHistoryStore.loadReadHistoryPausedState();
});

const loader: Loader<WebNovelOutlineDto> = (page, _query, _selected) =>
  runCatching(readHistoryStore.listReadHistoryWeb({ page, pageSize: 30 }));

const clearHistory = () =>
  doAction(
    readHistoryStore.clearReadHistoryWeb().then(() => {
      window.location.reload();
    }),
    '清空',
    message,
  );

const deleteHistory = (providerId: string, novelId: string) =>
  doAction(
    readHistoryStore.deleteReadHistoryWeb(providerId, novelId).then(() => {
      window.location.reload();
    }),
    '删除',
    message,
  );
</script>

<template>
  <div class="layout-content">
    <n-h1>阅读历史</n-h1>

    <n-flex style="margin-bottom: 24px">
      <c-button-confirm
        hint="真的要清空记录吗？"
        label="清空记录"
        :icon="DeleteOutlineOutlined"
        @action="clearHistory()"
      />
      <c-button
        v-if="readHistoryPaused"
        label="继续记录历史"
        @action="readHistoryStore.resumeReadHistory()"
      />
      <c-button
        v-else
        label="暂停记录历史"
        @action="readHistoryStore.pauseReadHistory()"
      />
    </n-flex>

    <n-text v-if="readHistoryPaused" type="warning">
      注意：历史功能已暂停
    </n-text>

    <novel-page :page="page" :loader="loader" :options="[]" v-slot="{ items }">
      <novel-list-web :items="items" simple>
        <template #action="item">
          <c-button
            size="tiny"
            label="删除"
            style="margin-top: 2px"
            @action="deleteHistory(item.providerId, item.novelId)"
          />
        </template>
      </novel-list-web>
    </novel-page>
  </div>
</template>
