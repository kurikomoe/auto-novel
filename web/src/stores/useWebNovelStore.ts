import { WebNovelApi } from '@/data';
import { WebNovelDto } from '@/model/WebNovel';
import { Result, runCatching } from '@/util/result';

export const useWebNovelStore = (providerId: string, novelId: string) => {
  return defineStore(`web-novel/${providerId}/${novelId}`, () => {
    const novelResult = ref<Result<WebNovelDto>>();

    async function loadNovel(force = false) {
      if (!force && novelResult.value?.ok) {
        return novelResult.value;
      }

      novelResult.value = undefined;
      const result = await runCatching(
        WebNovelApi.getNovel(providerId, novelId),
      );
      novelResult.value = result;

      return result;
    }

    async function updateNovel(
      json: Parameters<typeof WebNovelApi.updateNovel>[2],
    ) {
      await WebNovelApi.updateNovel(providerId, novelId, json);
      loadNovel(true);
    }

    return {
      novelResult,
      loadNovel,
      updateNovel,
    };
  })();
};
