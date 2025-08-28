import { WebNovelApi } from '@/data';
import { WebNovelDto } from '@/model/WebNovel';
import { Result, runCatching } from '@/util/result';

type WebNovelStore = {
  novelResult: Result<WebNovelDto> | undefined;
};

export const useWebNovelStore = (providerId: string, novelId: string) => {
  return defineStore(`web-novel/${providerId}/${novelId}`, {
    state: () =>
      <WebNovelStore>{
        novelResult: undefined,
      },
    actions: {
      async loadNovel(force = false) {
        if (!force && this.novelResult?.ok) {
          return this.novelResult;
        }

        this.novelResult = undefined;
        const result = await runCatching(
          WebNovelApi.getNovel(providerId, novelId),
        );
        this.novelResult = result;

        return this.novelResult;
      },

      async updateNovel(json: Parameters<typeof WebNovelApi.updateNovel>[2]) {
        await WebNovelApi.updateNovel(providerId, novelId, json);
        this.loadNovel(true);
      },
    },
  })();
};
