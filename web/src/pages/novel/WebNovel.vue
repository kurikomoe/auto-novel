<script lang="ts" setup>
import { formatError } from '@/api';
import { WebNovelRepo } from '@/repos';
import { useIsWideScreen } from '@/pages/util';

const { providerId, novelId } = defineProps<{
  providerId: string;
  novelId: string;
}>();

const isWideScreen = useIsWideScreen();
const router = useRouter();

const { data: novel, error } = WebNovelRepo.useWebNovel(providerId, novelId);

watch(novel, (novel) => {
  if (novel) {
    document.title = novel.titleJp;
  }
});

watch(error, async (error) => {
  if (!error) return;
  const message = await formatError(error);
  if (message.includes('小说ID不合适，应当使用：')) {
    const targetNovelPath = message.split('小说ID不合适，应当使用：')[1];
    router.push({ path: `/novel${targetNovelPath}` });
  }
});
</script>

<template>
  <div class="layout-content">
    <template v-if="novel">
      <web-novel-wide
        v-if="isWideScreen"
        :provider-id="providerId"
        :novel-id="novelId"
        :novel="novel"
      />
      <web-novel-narrow
        v-else
        :provider-id="providerId"
        :novel-id="novelId"
        :novel="novel"
      />
    </template>

    <n-result
      v-else-if="error"
      status="error"
      title="加载错误"
      :description="error.message"
    />
  </div>
</template>
