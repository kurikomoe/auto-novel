import { ReadHistoryApi } from '@/data/api';

export const useReadHistoryStore = defineStore('read-history', () => {
  const readHistoryPaused = ref<boolean>(false);

  let remoteFetched = false;
  const loadReadHistoryPausedState = async () => {
    if (remoteFetched) return;
    readHistoryPaused.value = await ReadHistoryApi.isReadHistoryPaused();
    remoteFetched = true;
  };

  const pauseReadHistory = async () => {
    await ReadHistoryApi.pauseReadHistory();
    readHistoryPaused.value = true;
  };
  const resumeReadHistory = async () => {
    await ReadHistoryApi.resumeReadHistory();
    readHistoryPaused.value = false;
  };

  return {
    readHistoryPaused,
    //
    listReadHistoryWeb: ReadHistoryApi.listReadHistoryWeb,
    clearReadHistoryWeb: ReadHistoryApi.clearReadHistoryWeb,
    updateReadHistoryWeb: ReadHistoryApi.updateReadHistoryWeb,
    deleteReadHistoryWeb: ReadHistoryApi.deleteReadHistoryWeb,
    //
    loadReadHistoryPausedState,
    pauseReadHistory,
    resumeReadHistory,
  };
});
