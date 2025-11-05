<script setup lang="ts">
import { useEventListener } from '@vueuse/core';

import { useSettingStore, useWhoamiStore } from '@/stores';
import { AuthUrl } from '@/util';

const props = defineProps<{ from?: string }>();
const router = useRouter();

const whoamiStore = useWhoamiStore();

const settingStore = useSettingStore();
const { setting } = storeToRefs(settingStore);

useEventListener('message', async (event: MessageEvent) => {
  if (event.origin === AuthUrl && event.data.type === 'login_success') {
    await whoamiStore.refresh().then(() => {
      const from = props.from ?? '/';
      router.replace(from);
    });
  }
});
</script>

<template>
  <iframe
    :src="AuthUrl + '?app=n&theme=' + setting.theme"
    frameborder="0"
    allowfullscreen
    style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border: none;
      z-index: 9999;
    "
  ></iframe>
</template>
